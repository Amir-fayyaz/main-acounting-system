import { ValidationError } from '../../../../shared/errors/category-errors.js';
import { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { causedBy } from '../../../../shared/messaging/message.js';
import { toConflict } from '../../../../shared/persistence/optimistic-concurrency.js';
import type { WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import { Revision } from '../../../../shared/persistence/revision.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { tenantScopedMessageOptions } from '../../../../shared/tenant/tenant-message-options.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import { MembershipStatusChanged } from '../../domain/events/membership.events.js';
import type { MembershipRepository } from '../../domain/repositories/membership.repository.js';
import { isMembershipId, membershipIdFrom } from '../../domain/value-objects/membership-id.js';
import { MembershipStatus } from '../../domain/value-objects/membership-status.js';
import type { ChangeMembershipStatus } from '../commands/change-membership-status.command.js';
import type { MembershipEventRecorder } from '../ports/membership-event-recorder.port.js';
import { parseExpectedRevision } from '../services/user-input.js';
import { membershipNotFound, resolveMembershipTenant } from '../services/membership-scope.js';
import { toMembershipView } from '../views/membership.mapper.js';
import type { MembershipView } from '../views/membership.view.js';

/**
 * Moves a membership along its lifecycle (IAM-003).
 *
 * The requested move is decided by the *domain*, not here: the aggregate's
 * `activate`/`deactivate` methods refuse a transition that does not apply from
 * the current state (`InvalidMembershipStatusTransitionError`), and a refusal
 * becomes a normal `Result` failure. A successful move is written against the
 * revision the caller read, and raises `MembershipStatusChanged` in the same
 * transaction.
 *
 * **Tenant boundary.** The membership must belong to the tenant of the current
 * tenant context; a mismatch is answered as not-found, so a caller cannot
 * deactivate a membership in another tenant by knowing its id.
 *
 * **Concurrency.** The write is a compare-and-swap on the revision the caller
 * read (SHR-008): if anything wrote in between, the change is refused as a
 * conflict instead of silently overwriting the winner. Deactivation changes the
 * state and nothing else — the record, the user and the tenant all survive it.
 */
export class ChangeMembershipStatusUseCase {
  public constructor(
    private readonly repository: MembershipRepository,
    private readonly events: MembershipEventRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(
    command: ChangeMembershipStatus,
  ): Promise<Result<MembershipView, DomainError>> {
    const {
      membershipId: rawId,
      tenantId: rawTenantId,
      status: rawStatus,
      expectedRevision,
    } = command.payload;

    if (!isMembershipId(rawId)) {
      return Result.fail(membershipNotFound());
    }

    if (!MembershipStatus.is(rawStatus)) {
      return Result.fail(
        new ValidationError('The membership status is invalid.', [
          {
            code: 'MEMBERSHIP_STATUS_INVALID',
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

    const tenantId = resolveMembershipTenant(rawTenantId);
    if (tenantId.isFail()) {
      return Result.fail(tenantId.errorOrThrow());
    }

    const id = membershipIdFrom(rawId);
    const target = MembershipStatus.from(rawStatus);
    const scopeTenant = tenantId.valueOrThrow().value;

    return this.boundary.execute<Result<MembershipView, DomainError>>(async () => {
      const loaded = await this.repository.get(id);
      if (loaded === undefined || loaded.aggregate.tenantId.value !== scopeTenant) {
        return Result.fail(membershipNotFound());
      }

      const membership = loaded.aggregate;
      const from = membership.status.value;

      try {
        if (target.isActive()) {
          membership.activate(DateTime.now());
        } else {
          membership.deactivate(DateTime.now());
        }
      } catch (error) {
        if (error instanceof DomainError) {
          return Result.fail(error);
        }
        throw error;
      }

      let receipt: WriteReceipt;
      try {
        receipt = await this.repository.update(membership, Revision.of(revision.valueOrThrow()));
      } catch (error) {
        const conflict = toConflict(error);
        if (conflict !== undefined) {
          return Result.fail(conflict);
        }
        throw error;
      }

      await this.events.record(
        new MembershipStatusChanged(
          {
            membershipId: membership.membershipId(),
            userId: membership.userId.value,
            tenantId: membership.tenantId.value,
            from,
            to: membership.status.value,
          },
          tenantScopedMessageOptions(causedBy(command)),
        ),
      );

      return Result.ok(toMembershipView({ aggregate: membership, revision: receipt.revision }));
    });
  }
}
