import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { causedBy } from '../../../../shared/messaging/message.js';
import { staleRevisionOf } from '../../../../shared/persistence/optimistic-concurrency.js';
import type { Loaded } from '../../../../shared/persistence/repository-ports.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import { AuthSession } from '../../domain/aggregates/auth-session.js';
import {
  AccountNotAuthenticatableError,
  InvalidCredentialsError,
  UserLockedOutError,
} from '../../domain/errors/authentication.errors.js';
import {
  SignInFailed,
  UserAuthenticated,
  UserAccountLocked,
  LockedOutAccountTargeted,
} from '../../domain/events/authentication.events.js';
import type { AuthSessionRepository } from '../../domain/repositories/auth-session.repository.js';
import type { CredentialRepository } from '../../domain/repositories/credential.repository.js';
import type { UserRepository } from '../../domain/repositories/user.repository.js';
import type { LockoutPolicy, User } from '../../domain/aggregates/user.js';
import { userIdFrom } from '../../domain/value-objects/user-id.js';
import type { SignIn } from '../commands/sign-in.command.js';
import type { AuthenticationAuditRecorder } from '../ports/authentication-audit-recorder.port.js';
import type { AuthenticationSecurityLogger } from '../ports/authentication-security-logger.port.js';
import type { PasswordHasher } from '../ports/password-hasher.port.js';
import type { SessionTokenService } from '../ports/session-token-service.port.js';
import { parsePlainPassword } from '../services/authentication-input.js';
import { parseUserEmail } from '../services/user-input.js';
import { toPrincipalView } from '../views/principal.mapper.js';
import type { SignedInView } from '../views/signed-in.view.js';

/**
 * Establishes an authenticated identity (IAM-005; TECH-006).
 *
 * The flow is deliberately ordered, and every step exists for a reason:
 *
 * 1. validate the input in business terms (a malformed email or a secret that
 *    breaks the password policy is an expected `Result` failure);
 * 2. resolve the user **first**, then the credential — never the other way
 *    round, so a credential read cannot become a second way to probe identities;
 * 3. when either is missing, spend the same key-derivation work a real
 *    verification would (`verifyWithoutCredential`) and answer with the one
 *    generic `InvalidCredentialsError`. A caller can therefore not tell an
 *    unknown email from a user without a credential from a wrong secret — by
 *    response *or* by timing;
 * 4. verify the secret through the hashing port, which compares in constant
 *    time;
 * 5. only *after* the secret matched, check the user's lifecycle. Checking it
 *    earlier would make "this account exists but is disabled" reachable without
 *    the password, and account state is not something an unauthenticated caller
 *    gets to learn;
 * 6. in **one** transaction, create the session, store it and record
 *    `UserAuthenticated`, so the fact commits with the state it reports;
 * 7. return only what the authentication contract allows: the token (once), its
 *    type, when it expires and the principal.
 *
 * Failure paths write no state — only an audit record — so they are evaluated
 * *outside* the transaction. That is deliberate: a failure returned from inside
 * a boundary would roll the audit record back with it and the security trail
 * would lose exactly the events it most needs.
 *
 * Authentication ends here. Nothing in this use case reads a membership, a role
 * or a tenant, and nothing establishes a tenant scope: a successful sign-in
 * proves who the user is and grants nothing else.
 */
export class SignInUseCase {
  public constructor(
    private readonly users: UserRepository,
    private readonly credentials: CredentialRepository,
    private readonly sessions: AuthSessionRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: SessionTokenService,
    private readonly audit: AuthenticationAuditRecorder,
    private readonly boundary: TransactionBoundary,
    private readonly sessionTtlMinutes: number,
    private readonly lockout: LockoutPolicy,
    private readonly securityLog: AuthenticationSecurityLogger,
  ) {}

  public async execute(command: SignIn): Promise<Result<SignedInView, DomainError>> {
    const email = parseUserEmail(command.payload.email);
    if (email.isFail()) {
      return Result.fail(email.errorOrThrow());
    }

    const password = parsePlainPassword(command.payload.password);
    if (password.isFail()) {
      return Result.fail(password.errorOrThrow());
    }

    const normalizedEmail = email.valueOrThrow().value;
    const secret = password.valueOrThrow();
    const now = DateTime.now();

    const found = await this.users.findByEmail(normalizedEmail);

    // Lockout (SEC-002) is decided before any credential work runs: a locked
    // account must answer the same way whether the supplied secret was right or
    // wrong, so nothing below this branch may be reached for it.
    if (found !== undefined && found.aggregate.isLocked(now)) {
      await this.recordLockedOutAttempt(command, found.aggregate);
      return Result.fail(new UserLockedOutError());
    }

    const credential =
      found === undefined ? undefined : await this.credentials.get(found.aggregate.id);

    if (found === undefined || credential === undefined) {
      await this.hasher.verifyWithoutCredential(secret);
      return this.reject(
        new SignInFailed({ email: normalizedEmail, reason: 'UNKNOWN_CREDENTIAL' }),
      );
    }

    const matches = await this.hasher.verify(secret, credential.aggregate.passwordHash);

    if (!matches) {
      // A credential failure is what the lockout counter counts. The client is
      // still told only that the credentials did not match — including on the
      // attempt that happens to lock the account; the *next* attempt is the one
      // that reports the lockout.
      await this.recordFailedAttempt(found, normalizedEmail, now, command);
      return Result.fail(new InvalidCredentialsError());
    }

    if (!found.aggregate.isActive()) {
      // A lifecycle refusal is not a credential failure, so it does not touch
      // the lockout counter: an administrator's decision must not be able to
      // lock an account out of its own recovery path.
      return this.reject(
        new SignInFailed({
          email: normalizedEmail,
          reason: 'ACCOUNT_NOT_AUTHENTICATABLE',
          userId: found.aggregate.userId(),
        }),
        new AccountNotAuthenticatableError(),
      );
    }

    return this.establish(command, found, now);
  }

  /**
   * Creates the session, clears the failure counter and records the success,
   * atomically.
   *
   * Resetting the counter in the same unit of work as the session is what makes
   * "a successful attempt resets the counter" a fact rather than a good
   * intention: a client can never observe a created session while the failures
   * that preceded it are still counted, or the other way round.
   */
  private async establish(
    command: SignIn,
    loaded: Loaded<User>,
    now: DateTime,
  ): Promise<Result<SignedInView, DomainError>> {
    const issued = this.tokens.issue();
    const expiresAt = DateTime.fromEpochMillis(now.epochMillis + this.sessionTtlMinutes * 60_000);
    let current = loaded;

    for (let attempt = 1; attempt <= MAX_LOCKOUT_WRITE_ATTEMPTS; attempt += 1) {
      const user = current.aggregate;

      try {
        return await this.boundary.execute<Result<SignedInView, DomainError>>(async () => {
          if (user.failedAuthAttempts > 0 || user.lockedUntil !== undefined) {
            user.clearFailedAuthentications(now);
            await this.users.update(user, current.revision);
          }

          const session = AuthSession.create({
            userId: user.id,
            tokenHash: issued.hash,
            expiresAt,
            now,
          });

          await this.sessions.add(session);

          await this.audit.record(
            new UserAuthenticated(
              {
                userId: session.userIdValue(),
                sessionId: session.sessionId(),
                expiresAt: expiresAt.toIsoString(),
              },
              causedBy(command),
            ),
          );

          return Result.ok({
            token: issued.token,
            tokenType: 'Bearer',
            expiresAt: expiresAt.toIsoString(),
            principal: toPrincipalView(user),
          });
        });
      } catch (error) {
        // A lost race on the counter reset is retried with the revision that
        // actually landed, so the reset is not silently skipped.
        const stale = staleRevisionOf(error);
        if (stale === undefined || attempt === MAX_LOCKOUT_WRITE_ATTEMPTS) {
          throw error;
        }

        const reloaded = await this.users.get(user.id);
        if (reloaded === undefined) {
          throw error;
        }
        current = reloaded;
      }
    }

    // Unreachable: the loop either returns or throws on its last attempt.
    throw new Error('SignInUseCase.establish exhausted its attempts without an outcome.');
  }

  /**
   * Records one credential failure against the account — the durable half of
   * SEC-002 — and the audit facts that go with it.
   *
   * The counter, the lockout transition and their audit records are written in
   * one transaction, so the trail and the state can never disagree. Two
   * concurrent failures must both count, so a stale revision re-reads the
   * account and re-applies the failure instead of dropping it; if that budget is
   * exhausted the attempt is still answered with the generic credential failure,
   * because a client must never learn that the counter was not written.
   */
  private async recordFailedAttempt(
    loaded: Loaded<User>,
    email: string,
    now: DateTime,
    command: SignIn,
  ): Promise<void> {
    let current: Loaded<User> | undefined = loaded;

    for (let attempt = 1; attempt <= MAX_LOCKOUT_WRITE_ATTEMPTS; attempt += 1) {
      if (current === undefined) {
        return;
      }

      const user = current.aggregate;

      // Already locked: the attempt is recorded as a locked-out attempt by the
      // caller and the lockout is not extended.
      if (user.isLocked(now)) {
        return;
      }

      const revision = current.revision;
      let lockedNow = false;

      try {
        await this.boundary.execute(async () => {
          user.recordFailedAuthentication(this.lockout, now);
          lockedNow = user.isLocked(now);

          await this.users.update(user, revision);

          await this.audit.record(
            new SignInFailed({ email, reason: 'INVALID_SECRET', userId: user.userId() }),
          );

          if (lockedNow) {
            await this.audit.record(new UserAccountLocked({ userId: user.userId() }));
          }
        });
      } catch (error) {
        const stale = staleRevisionOf(error);
        if (stale === undefined || attempt === MAX_LOCKOUT_WRITE_ATTEMPTS) {
          if (stale === undefined) {
            throw error;
          }
          return;
        }

        current = await this.users.get(userIdFrom(user.userId()));
        continue;
      }

      if (lockedNow) {
        this.securityLog.lockoutTransitioned({
          userId: user.userId(),
          correlationId: commandCorrelation(command),
          threshold: this.lockout.threshold,
          durationMs: this.lockout.durationMs,
        });
      }

      return;
    }
  }

  /** Records an attempt that targeted an account which is already locked. */
  private async recordLockedOutAttempt(command: SignIn, user: User): Promise<void> {
    await this.audit.record(new LockedOutAccountTargeted({ userId: user.userId() }));
    this.securityLog.lockedOutAttempt({
      userId: user.userId(),
      correlationId: commandCorrelation(command),
    });
  }

  /**
   * Records a failure that is not a credential failure, then answers with it.
   *
   * The audit record is written *before* the outcome is returned, so the trail
   * always contains the attempt a client is told about; the client sees the same
   * `InvalidCredentialsError` whatever actually went wrong.
   */
  private async reject(
    event: SignInFailed,
    error: DomainError = new InvalidCredentialsError(),
  ): Promise<Result<SignedInView, DomainError>> {
    await this.audit.record(event);
    return Result.fail(error);
  }
}

/**
 * How many times a lockout write is re-applied after losing an optimistic race.
 *
 * Two concurrent failures must both count; a few attempts cover a realistic
 * burst without turning a hot account into an unbounded retry loop.
 */
const MAX_LOCKOUT_WRITE_ATTEMPTS = 3;

/** The correlation id the caller carried, when the boundary passed one through. */
function commandCorrelation(command: SignIn): string | undefined {
  return command.metadata.correlationId;
}
