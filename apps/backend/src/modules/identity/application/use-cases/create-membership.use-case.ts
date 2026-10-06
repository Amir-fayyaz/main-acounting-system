import { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { causedBy } from '../../../../shared/messaging/message.js';
import { toConflict } from '../../../../shared/persistence/optimistic-concurrency.js';
import type { WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { tenantScopedMessageOptions } from '../../../../shared/tenant/tenant-message-options.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import type { TenantDirectory } from '../../../tenant/application/ports/tenant-directory.port.js';
import { Membership } from '../../domain/aggregates/membership.js';
import {
  DuplicateMembershipError,
  MembershipTenantNotFoundError,
} from '../../domain/errors/membership.errors.js';
import { UserNotFoundError } from '../../domain/errors/user.errors.js';
import { MembershipCreated } from '../../domain/events/membership.events.js';
import type { MembershipRepository } from '../../domain/repositories/membership.repository.js';
import type { UserRepository } from '../../domain/repositories/user.repository.js';
import type { CreateMembership } from '../commands/create-membership.command.js';
import type { MembershipEventRecorder } from '../ports/membership-event-recorder.port.js';
import { parseMembershipUserId } from '../services/membership-input.js';
import { resolveMembershipTenant } from '../services/membership-scope.js';
import { toMembershipView } from '../views/membership.mapper.js';
import type { MembershipView } from '../views/membership.view.js';

/**
 * Links an existing User to an existing Tenant (IAM-003).
 *
 * The use case is deliberately small and explicit:
 *
 * 1. validate the input in business terms (bad input is an expected failure,
 *    returned as a `Result`, not thrown);
 * 2. resolve the tenant boundary from the ambient tenant scope, so the write
 *    happens under the tenant it belongs to and a client-supplied tenant cannot
 *    point it elsewhere;
 * 3. inside **one** transaction boundary — which is what makes the sequence
 *    atomic as a whole (SHR-005):
 *    - confirm the user exists (this module's own identity);
 *    - confirm the tenant exists through the published `TenantDirectory`
 *      contract — never by reading tenant storage, which the module boundary
 *      forbids;
 *    - refuse a membership that already exists for the pair, whatever its
 *      state;
 *    - insert the record and record `MembershipCreated` in the outbox, so the
 *      fact commits with the state change or not at all (SHR-006).
 *
 * **Concurrency.** The existence check and the insert are inside the same
 * boundary, and the unique key on (user, tenant) is the final authority: if two
 * creators race past the check, the second insert is refused by the database and
 * reported as the duplicate it is (`toConflict`), not as a server error. Nothing
 * is retried, and no membership is created twice.
 *
 * Authentication and authorization are intentionally absent: membership records
 * whether a relationship exists, not whether a caller may create it.
 */
export class CreateMembershipUseCase {
  public constructor(
    private readonly repository: MembershipRepository,
    private readonly users: UserRepository,
    private readonly tenants: TenantDirectory,
    private readonly events: MembershipEventRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(command: CreateMembership): Promise<Result<MembershipView, DomainError>> {
    const userId = parseMembershipUserId(command.payload.userId);
    if (userId.isFail()) {
      return Result.fail(userId.errorOrThrow());
    }

    const tenantId = resolveMembershipTenant(command.payload.tenantId);
    if (tenantId.isFail()) {
      return Result.fail(tenantId.errorOrThrow());
    }

    const user = userId.valueOrThrow();
    const tenant = tenantId.valueOrThrow();

    return this.boundary.execute<Result<MembershipView, DomainError>>(async () => {
      if (!(await this.users.existsById(user))) {
        return Result.fail(new UserNotFoundError());
      }

      if (!(await this.tenants.exists(tenant.value))) {
        return Result.fail(new MembershipTenantNotFoundError());
      }

      if (await this.repository.existsForPair(user, tenant)) {
        return Result.fail(new DuplicateMembershipError(user.value, tenant.value));
      }

      const membership = Membership.create({ userId: user, tenantId: tenant, now: DateTime.now() });

      let receipt: WriteReceipt;
      try {
        receipt = await this.repository.add(membership);
      } catch (error) {
        // A unique-key collision here means someone else created the pair
        // between the check and the insert: a lost race, reported as the
        // duplicate it is rather than as a server error.
        if (toConflict(error) !== undefined) {
          return Result.fail(new DuplicateMembershipError(user.value, tenant.value));
        }
        throw error;
      }

      await this.events.record(
        new MembershipCreated(
          {
            membershipId: membership.membershipId(),
            userId: membership.userId.value,
            tenantId: membership.tenantId.value,
            status: membership.status.value,
          },
          tenantScopedMessageOptions(causedBy(command)),
        ),
      );

      return Result.ok(toMembershipView({ aggregate: membership, revision: receipt.revision }));
    });
  }
}
