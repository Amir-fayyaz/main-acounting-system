import { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { causedBy } from '../../../../shared/messaging/message.js';
import { toConflict } from '../../../../shared/persistence/optimistic-concurrency.js';
import type { WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import { User } from '../../domain/aggregates/user.js';
import { DuplicateUserError } from '../../domain/errors/user.errors.js';
import { UserCreated } from '../../domain/events/user.events.js';
import type { UserRepository } from '../../domain/repositories/user.repository.js';
import type { CreateUser } from '../commands/create-user.command.js';
import type { UserEventRecorder } from '../ports/user-event-recorder.port.js';
import { parseDisplayName, parseUserEmail } from '../services/user-input.js';
import { toUserView } from '../views/user.mapper.js';
import type { UserView } from '../views/user.view.js';

/**
 * Creates a User — a system identity independent of any tenant (IAM-002).
 *
 * The use case is deliberately small and explicit:
 *
 * 1. validate the input in business terms (bad input is an expected failure,
 *    returned as a `Result`, not thrown);
 * 2. refuse a duplicate primary contact email, which is the identity-level
 *    uniqueness invariant this stage requires;
 * 3. create the aggregate, which assigns the stable identity and starts it in
 *    the `active` state;
 * 4. inside **one** transaction boundary, insert the record and record
 *    `UserCreated` in the outbox, so the fact commits with the state change or
 *    not at all (SHR-005, SHR-006);
 * 5. return the created user as a view, carrying the revision the next update
 *    must state.
 *
 * Authentication and authorization are intentionally absent: creating a user
 * here is an identity operation, not a security operation, and this issue does
 * not implement either capability.
 */
export class CreateUserUseCase {
  public constructor(
    private readonly repository: UserRepository,
    private readonly events: UserEventRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(command: CreateUser): Promise<Result<UserView, DomainError>> {
    const displayName = parseDisplayName(command.payload.displayName);
    if (displayName.isFail()) {
      return Result.fail(displayName.errorOrThrow());
    }

    const email = parseUserEmail(command.payload.email);
    if (email.isFail()) {
      return Result.fail(email.errorOrThrow());
    }

    const normalizedEmail = email.valueOrThrow().value;

    return this.boundary.execute<Result<UserView, DomainError>>(async () => {
      if (await this.repository.existsByEmail(normalizedEmail)) {
        return Result.fail(new DuplicateUserError('email', normalizedEmail));
      }

      const user = User.create({
        displayName: displayName.valueOrThrow().value,
        email: normalizedEmail,
        now: DateTime.now(),
      });

      let receipt: WriteReceipt;
      try {
        receipt = await this.repository.add(user);
      } catch (error) {
        // A unique-key collision here means someone else claimed the email
        // between the check and the insert: a lost race, reported as the
        // duplicate it is rather than as a server error.
        if (toConflict(error) !== undefined) {
          return Result.fail(new DuplicateUserError('email', normalizedEmail));
        }
        throw error;
      }

      await this.events.record(
        new UserCreated(
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
