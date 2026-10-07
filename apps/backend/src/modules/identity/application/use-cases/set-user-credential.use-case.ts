import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { causedBy } from '../../../../shared/messaging/message.js';
import { toConflict } from '../../../../shared/persistence/optimistic-concurrency.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import { Credential } from '../../domain/aggregates/credential.js';
import { InactiveUserError, UserNotFoundError } from '../../domain/errors/user.errors.js';
import { UserCredentialEstablished } from '../../domain/events/authentication.events.js';
import type { AuthSessionRepository } from '../../domain/repositories/auth-session.repository.js';
import type { CredentialRepository } from '../../domain/repositories/credential.repository.js';
import type { UserRepository } from '../../domain/repositories/user.repository.js';
import { isUserId, userIdFrom } from '../../domain/value-objects/user-id.js';
import type { SetUserCredential } from '../commands/set-user-credential.command.js';
import type { AuthenticationAuditRecorder } from '../ports/authentication-audit-recorder.port.js';
import type { PasswordHasher } from '../ports/password-hasher.port.js';
import { parsePlainPassword } from '../services/authentication-input.js';
import type { CredentialView } from '../views/credential.view.js';

/**
 * Establishes — or replaces — the credential a user signs in with (IAM-005).
 *
 * Authentication resolves to an **existing** user: this use case never creates
 * one, so a credential cannot become a second way to introduce an identity and
 * a sign-in can never produce a duplicate user record. It refuses a user that
 * does not exist and a user whose lifecycle does not allow authentication,
 * exactly like the sign-in itself does.
 *
 * Replacing an existing credential is the same operation, and it has one
 * consequence that matters: **the sessions the previous secret established are
 * invalidated**, in the same transaction, before the operation is reported as
 * successful. A changed secret that left an old session usable would defeat the
 * reason for changing it.
 *
 * The passphrase policy and the hashing decision are not invented here: the
 * secret is validated by the password primitive and derived by the password
 * hashing port, so this use case stores a hash it cannot reverse and never
 * handles plaintext beyond handing it to that port.
 *
 * Authorization is explicitly *not* part of this issue: like the other identity
 * resources at this stage, the operation is unguarded until authorization is
 * enforced. See the command's own note.
 */
export class SetUserCredentialUseCase {
  public constructor(
    private readonly users: UserRepository,
    private readonly credentials: CredentialRepository,
    private readonly sessions: AuthSessionRepository,
    private readonly hasher: PasswordHasher,
    private readonly audit: AuthenticationAuditRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(command: SetUserCredential): Promise<Result<CredentialView, DomainError>> {
    const { userId: rawId, password: rawPassword } = command.payload;

    if (!isUserId(rawId)) {
      return Result.fail(new UserNotFoundError());
    }

    const password = parsePlainPassword(rawPassword);
    if (password.isFail()) {
      return Result.fail(password.errorOrThrow());
    }

    const id = userIdFrom(rawId);
    const found = await this.users.get(id);

    if (found === undefined) {
      return Result.fail(new UserNotFoundError());
    }

    if (!found.aggregate.isActive()) {
      return Result.fail(new InactiveUserError());
    }

    // Deriving the hash happens before the transaction opens: a deliberately
    // expensive operation must not hold a database transaction open for its
    // duration, and nothing it depends on can change under it.
    const existing = await this.credentials.get(id);
    const passwordHash = await this.hasher.hash(password.valueOrThrow());
    const now = DateTime.now();

    return this.boundary.execute<Result<CredentialView, DomainError>>(async () => {
      const replaced = existing !== undefined;

      try {
        if (existing === undefined) {
          await this.credentials.add(Credential.create({ userId: id, passwordHash, now }));
        } else {
          existing.aggregate.replacePasswordHash(passwordHash, now);
          await this.credentials.update(existing.aggregate, existing.revision);
        }
      } catch (error) {
        // A credential established between the read and this write is a lost
        // race, reported as the conflict it is rather than silently overwriting
        // the credential another caller just set.
        const conflict = toConflict(error);
        if (conflict !== undefined) {
          return Result.fail(conflict);
        }
        throw error;
      }

      const sessionsInvalidated = await this.sessions.revokeActiveForUser(id, now);

      await this.audit.record(
        new UserCredentialEstablished(
          {
            userId: id.value,
            algorithm: passwordHash.algorithm,
            replaced,
            sessionsInvalidated,
          },
          causedBy(command),
        ),
      );

      return Result.ok({
        userId: id.value,
        algorithm: passwordHash.algorithm,
        replaced,
        sessionsInvalidated,
        updatedAt: now.toIsoString(),
      });
    });
  }
}
