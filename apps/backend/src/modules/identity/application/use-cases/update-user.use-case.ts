import { ValidationError } from '../../../../shared/errors/category-errors.js';
import { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { causedBy } from '../../../../shared/messaging/message.js';
import { toConflict } from '../../../../shared/persistence/optimistic-concurrency.js';
import type { WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import { Revision } from '../../../../shared/persistence/revision.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import { UserProfileUpdated } from '../../domain/events/user.events.js';
import type { UserRepository } from '../../domain/repositories/user.repository.js';
import { isUserId, userIdFrom } from '../../domain/value-objects/user-id.js';
import type { UpdateUser } from '../commands/update-user.command.js';
import type { UserEventRecorder } from '../ports/user-event-recorder.port.js';
import { parseDisplayName, parseExpectedRevision, parseUserEmail } from '../services/user-input.js';
import { UserNotFoundError } from '../../domain/errors/user.errors.js';
import { toUserView } from '../views/user.mapper.js';
import type { UserView } from '../views/user.view.js';

/**
 * Changes a User's mutable profile attributes (IAM-002).
 *
 * The write is protected end to end by the shared optimistic-concurrency
 * mechanism:
 *
 * - the command carries the revision the caller read;
 * - the repository refuses the write if the record moved, and the adapter
 *   reports that as a `staleRevisionConflict` (SHR-008);
 * - the use case translates it with `toConflict` into the shared
 *   `ConflictError`, so the client is told to reload instead of a silent
 *   overwrite happening.
 *
 * Before mutating, the use case validates the *current user state*: an inactive
 * user refuses the change (`InactiveUserError`), which becomes a normal
 * `Result` failure rather than a domain exception escaping. Only the provided
 * attributes are applied, and when neither actually changes anything the write
 * is skipped so the revision does not advance for a no-op.
 *
 * Authentication and authorization are intentionally absent.
 */
export class UpdateUserUseCase {
  public constructor(
    private readonly repository: UserRepository,
    private readonly events: UserEventRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(command: UpdateUser): Promise<Result<UserView, DomainError>> {
    const {
      userId: rawId,
      displayName: rawName,
      email: rawEmail,
      expectedRevision,
    } = command.payload;

    if (!isUserId(rawId)) {
      return Result.fail(new UserNotFoundError());
    }

    if (rawName === undefined && rawEmail === undefined) {
      return Result.fail(
        new ValidationError('Nothing to update.', [
          {
            code: 'USER_PROFILE_EMPTY',
            field: 'displayName',
            message: 'at least one of displayName or email must be provided',
          },
        ]),
      );
    }

    const revision = parseExpectedRevision(expectedRevision);
    if (revision.isFail()) {
      return Result.fail(revision.errorOrThrow());
    }

    const name = rawName === undefined ? undefined : parseDisplayName(rawName);
    if (name !== undefined && name.isFail()) {
      return Result.fail(name.errorOrThrow());
    }

    const email = rawEmail === undefined ? undefined : parseUserEmail(rawEmail);
    if (email !== undefined && email.isFail()) {
      return Result.fail(email.errorOrThrow());
    }

    const id = userIdFrom(rawId);
    const nextName = name?.valueOrThrow();
    const nextEmail = email?.valueOrThrow();

    return this.boundary.execute<Result<UserView, DomainError>>(async () => {
      const loaded = await this.repository.get(id);
      if (loaded === undefined) {
        return Result.fail(new UserNotFoundError());
      }

      const user = loaded.aggregate;

      try {
        const now = DateTime.now();
        let changed = false;

        if (nextName !== undefined && !user.displayName.equals(nextName)) {
          user.rename(nextName, now);
          changed = true;
        }
        if (nextEmail !== undefined && !user.email.equals(nextEmail)) {
          user.changeEmail(nextEmail, now);
          changed = true;
        }

        if (!changed) {
          return Result.ok(toUserView({ aggregate: user, revision: loaded.revision }));
        }
      } catch (error) {
        if (error instanceof DomainError) {
          return Result.fail(error);
        }
        throw error;
      }

      let receipt: WriteReceipt;
      try {
        receipt = await this.repository.update(user, Revision.of(revision.valueOrThrow()));
      } catch (error) {
        const conflict = toConflict(error);
        if (conflict !== undefined) {
          return Result.fail(conflict);
        }
        throw error;
      }

      await this.events.record(
        new UserProfileUpdated(
          {
            userId: user.userId(),
            displayName: user.displayName.value,
            email: user.email.value,
          },
          causedBy(command),
        ),
      );

      return Result.ok(toUserView({ aggregate: user, revision: receipt.revision }));
    });
  }
}
