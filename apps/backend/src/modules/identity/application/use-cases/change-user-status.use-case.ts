import { ValidationError } from '../../../../shared/errors/category-errors.js';
import { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { causedBy } from '../../../../shared/messaging/message.js';
import { toConflict } from '../../../../shared/persistence/optimistic-concurrency.js';
import type { WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import { Revision } from '../../../../shared/persistence/revision.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import { UserNotFoundError } from '../../domain/errors/user.errors.js';
import { UserStatusChanged } from '../../domain/events/user.events.js';
import type { UserRepository } from '../../domain/repositories/user.repository.js';
import { isUserId, userIdFrom } from '../../domain/value-objects/user-id.js';
import { UserStatus } from '../../domain/value-objects/user-status.js';
import type { ChangeUserStatus } from '../commands/change-user-status.command.js';
import type { UserEventRecorder } from '../ports/user-event-recorder.port.js';
import { parseExpectedRevision } from '../services/user-input.js';
import { toUserView } from '../views/user.mapper.js';
import type { UserView } from '../views/user.view.js';

/**
 * Moves a user along its lifecycle (IAM-002).
 *
 * The requested move is decided by the *domain*, not here: the aggregate's
 * `activate`/`deactivate` methods refuse a transition that does not apply from
 * the current state (`InvalidUserStatusTransitionError`), and a refusal becomes
 * a normal `Result` failure. A successful move is written against the revision
 * the caller read, exactly like a profile update, and raises
 * `UserStatusChanged` in the same transaction.
 *
 * There is no suspension, deletion or verification workflow here: the move is
 * only between the two states the current product model defines.
 */
export class ChangeUserStatusUseCase {
  public constructor(
    private readonly repository: UserRepository,
    private readonly events: UserEventRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(command: ChangeUserStatus): Promise<Result<UserView, DomainError>> {
    const { userId: rawId, status: rawStatus, expectedRevision } = command.payload;

    if (!isUserId(rawId)) {
      return Result.fail(new UserNotFoundError());
    }

    if (!UserStatus.is(rawStatus)) {
      return Result.fail(
        new ValidationError('The user status is invalid.', [
          {
            code: 'USER_STATUS_INVALID',
            field: 'status',
            message: 'status must be "active" or "inactive"',
          },
        ]),
      );
    }

    const revision = parseExpectedRevision(expectedRevision);
    if (revision.isFail()) {
      return Result.fail(revision.errorOrThrow());
    }

    const target = UserStatus.from(rawStatus);
    const id = userIdFrom(rawId);

    return this.boundary.execute<Result<UserView, DomainError>>(async () => {
      const loaded = await this.repository.get(id);
      if (loaded === undefined) {
        return Result.fail(new UserNotFoundError());
      }

      const user = loaded.aggregate;
      const from = user.status.value;

      try {
        if (target.isActive()) {
          user.activate(DateTime.now());
        } else {
          user.deactivate(DateTime.now());
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
        new UserStatusChanged(
          { userId: user.userId(), from, to: user.status.value },
          causedBy(command),
        ),
      );

      return Result.ok(toUserView({ aggregate: user, revision: receipt.revision }));
    });
  }
}
