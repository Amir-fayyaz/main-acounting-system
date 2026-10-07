import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { causedBy } from '../../../../shared/messaging/message.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import { AuthSession } from '../../domain/aggregates/auth-session.js';
import {
  AccountNotAuthenticatableError,
  InvalidCredentialsError,
} from '../../domain/errors/authentication.errors.js';
import { SignInFailed, UserAuthenticated } from '../../domain/events/authentication.events.js';
import type { AuthSessionRepository } from '../../domain/repositories/auth-session.repository.js';
import type { CredentialRepository } from '../../domain/repositories/credential.repository.js';
import type { UserRepository } from '../../domain/repositories/user.repository.js';
import type { User } from '../../domain/aggregates/user.js';
import type { SignIn } from '../commands/sign-in.command.js';
import type { AuthenticationAuditRecorder } from '../ports/authentication-audit-recorder.port.js';
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

    const found = await this.users.findByEmail(normalizedEmail);
    const credential =
      found === undefined ? undefined : await this.credentials.get(found.aggregate.id);

    if (found === undefined || credential === undefined) {
      await this.hasher.verifyWithoutCredential(secret);
      return this.reject(
        new SignInFailed({ email: normalizedEmail, reason: 'UNKNOWN_CREDENTIAL' }),
      );
    }

    const user = found.aggregate;
    const matches = await this.hasher.verify(secret, credential.aggregate.passwordHash);

    if (!matches) {
      return this.reject(
        new SignInFailed({
          email: normalizedEmail,
          reason: 'INVALID_SECRET',
          userId: user.userId(),
        }),
      );
    }

    if (!user.isActive()) {
      return this.reject(
        new SignInFailed({
          email: normalizedEmail,
          reason: 'ACCOUNT_NOT_AUTHENTICATABLE',
          userId: user.userId(),
        }),
        new AccountNotAuthenticatableError(),
      );
    }

    return this.establish(command, user);
  }

  /** Creates the session and records the successful authentication, atomically. */
  private async establish(command: SignIn, user: User): Promise<Result<SignedInView, DomainError>> {
    const now = DateTime.now();
    const issued = this.tokens.issue();
    const expiresAt = DateTime.fromEpochMillis(now.epochMillis + this.sessionTtlMinutes * 60_000);

    return this.boundary.execute<Result<SignedInView, DomainError>>(async () => {
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
  }

  /**
   * Records the failed attempt, then answers with the credential-level failure.
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
