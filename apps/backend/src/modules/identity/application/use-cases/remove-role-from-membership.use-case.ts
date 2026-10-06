import { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { causedBy } from '../../../../shared/messaging/message.js';
import { toConflict } from '../../../../shared/persistence/optimistic-concurrency.js';
import type { WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import { Revision } from '../../../../shared/persistence/revision.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { tenantScopedMessageOptions } from '../../../../shared/tenant/tenant-message-options.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import { MembershipRoleNotFoundError } from '../../domain/errors/membership-role.errors.js';
import { MembershipNotFoundError } from '../../domain/errors/membership.errors.js';
import { RoleUnassigned } from '../../domain/events/role.events.js';
import type { MembershipRoleRepository } from '../../domain/repositories/membership-role.repository.js';
import type { RoleRepository } from '../../domain/repositories/role.repository.js';
import { isMembershipId, membershipIdFrom } from '../../domain/value-objects/membership-id.js';
import {
  isMembershipRoleId,
  membershipRoleIdFrom,
} from '../../domain/value-objects/membership-role-id.js';
import type { RemoveRoleFromMembership } from '../commands/remove-role-from-membership.command.js';
import type { RoleEventRecorder } from '../ports/role-event-recorder.port.js';
import { resolveScopedTenant } from '../services/tenant-scope.js';
import { parseExpectedRevision } from '../services/user-input.js';
import { toMembershipRoleView } from '../views/role.mapper.js';
import type { MembershipRoleView } from '../views/membership-role.view.js';

/**
 * Removes a Role from a Membership (IAM-004).
 *
 * Removal is a *deactivation* of the assignment, not a delete: the record — and
 * the fact that the membership once held the role — is preserved, so the tenant
 * keeps its access history (the issue's historical-safety requirement). The
 * membership and the role are untouched; only the assignment's state changes.
 *
 * The assignment must belong to the tenant of the current scope and to the
 * membership named by the request; a mismatch is answered as not-found, so a
 * caller cannot end an assignment in another tenant by knowing its id. The write
 * is a compare-and-swap on the revision the caller read (SHR-008), so a removal
 * prepared against a stale read is refused as a conflict rather than silently
 * applied.
 */
export class RemoveRoleFromMembershipUseCase {
  public constructor(
    private readonly assignments: MembershipRoleRepository,
    private readonly roles: RoleRepository,
    private readonly events: RoleEventRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(
    command: RemoveRoleFromMembership,
  ): Promise<Result<MembershipRoleView, DomainError>> {
    const {
      tenantId: rawTenantId,
      membershipId: rawMembershipId,
      assignmentId: rawAssignmentId,
      expectedRevision,
    } = command.payload;

    if (!isMembershipId(rawMembershipId)) {
      return Result.fail(new MembershipNotFoundError());
    }
    if (!isMembershipRoleId(rawAssignmentId)) {
      return Result.fail(new MembershipRoleNotFoundError());
    }

    const revision = parseExpectedRevision(expectedRevision);
    if (revision.isFail()) {
      return Result.fail(revision.errorOrThrow());
    }

    const tenantId = resolveScopedTenant(rawTenantId);
    if (tenantId.isFail()) {
      return Result.fail(tenantId.errorOrThrow());
    }

    const membershipId = membershipIdFrom(rawMembershipId);
    const assignmentId = membershipRoleIdFrom(rawAssignmentId);
    const scopeTenant = tenantId.valueOrThrow().value;

    return this.boundary.execute<Result<MembershipRoleView, DomainError>>(async () => {
      const loaded = await this.assignments.get(assignmentId);
      if (
        loaded === undefined ||
        loaded.aggregate.tenantId.value !== scopeTenant ||
        loaded.aggregate.membershipId.value !== membershipId.value
      ) {
        return Result.fail(new MembershipRoleNotFoundError());
      }

      const assignment = loaded.aggregate;

      try {
        assignment.deactivate(DateTime.now());
      } catch (error) {
        if (error instanceof DomainError) {
          return Result.fail(error);
        }
        throw error;
      }

      let receipt: WriteReceipt;
      try {
        receipt = await this.assignments.update(assignment, Revision.of(revision.valueOrThrow()));
      } catch (error) {
        const conflict = toConflict(error);
        if (conflict !== undefined) {
          return Result.fail(conflict);
        }
        throw error;
      }

      const role = await this.roles.get(assignment.roleId);
      if (role === undefined) {
        // A role is never deleted, so a missing row is a broken record rather
        // than a business outcome; report it as not-found instead of inventing
        // a role for the response.
        return Result.fail(new MembershipRoleNotFoundError());
      }

      await this.events.record(
        new RoleUnassigned(
          {
            assignmentId: assignment.assignmentId(),
            tenantId: assignment.tenantId.value,
            membershipId: assignment.membershipId.value,
            roleId: assignment.roleId.value,
            status: assignment.status.value,
          },
          tenantScopedMessageOptions(causedBy(command)),
        ),
      );

      return Result.ok(
        toMembershipRoleView({ aggregate: assignment, revision: receipt.revision }, role.aggregate),
      );
    });
  }
}
