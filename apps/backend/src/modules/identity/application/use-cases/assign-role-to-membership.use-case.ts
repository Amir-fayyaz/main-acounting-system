import { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { causedBy } from '../../../../shared/messaging/message.js';
import { toConflict } from '../../../../shared/persistence/optimistic-concurrency.js';
import type { WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { tenantScopedMessageOptions } from '../../../../shared/tenant/tenant-message-options.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import { MembershipRole } from '../../domain/aggregates/membership-role.js';
import { DuplicateRoleAssignmentError } from '../../domain/errors/membership-role.errors.js';
import { InactiveRoleError, RoleNotFoundError } from '../../domain/errors/role.errors.js';
import { MembershipNotFoundError } from '../../domain/errors/membership.errors.js';
import { RoleAssigned } from '../../domain/events/role.events.js';
import type { MembershipRoleRepository } from '../../domain/repositories/membership-role.repository.js';
import type { MembershipRepository } from '../../domain/repositories/membership.repository.js';
import type { RoleRepository } from '../../domain/repositories/role.repository.js';
import { isMembershipId, membershipIdFrom } from '../../domain/value-objects/membership-id.js';
import { isRoleId, roleIdFrom } from '../../domain/value-objects/role-id.js';
import type { AssignRoleToMembership } from '../commands/assign-role-to-membership.command.js';
import type { RoleEventRecorder } from '../ports/role-event-recorder.port.js';
import { resolveScopedTenant } from '../services/tenant-scope.js';
import { toMembershipRoleView } from '../views/role.mapper.js';
import type { MembershipRoleView } from '../views/membership-role.view.js';

/**
 * Gives a Membership a Role of the same Tenant (IAM-004).
 *
 * The use case enforces the whole tenant-isolation rule before any write, inside
 * one transaction boundary (SHR-005):
 *
 * 1. the membership must exist and belong to the tenant of the current scope —
 *    otherwise `MembershipNotFoundError`;
 * 2. the role must exist and belong to *that same tenant* — a role of another
 *    tenant is answered exactly like an unknown one, so a cross-tenant
 *    assignment is refused without disclosing that the role exists elsewhere;
 * 3. the role must be active (`InactiveRoleError`) — an out-of-use role confers
 *    nothing, so it cannot be assigned;
 * 4. at most one assignment record is kept per (Membership, Role) pair: an
 *    actively held role is a duplicate conflict, and a previously *removed* role
 *    is reactivated rather than duplicated, preserving the history.
 *
 * **Concurrency.** The pair check and the insert are in the same boundary, and
 * the unique key on (membership, role) is the final authority: if two assigners
 * race past the check, the second insert is refused by the database and reported
 * as the duplicate it is (`toConflict`), not as a server error.
 */
export class AssignRoleToMembershipUseCase {
  public constructor(
    private readonly memberships: MembershipRepository,
    private readonly roles: RoleRepository,
    private readonly assignments: MembershipRoleRepository,
    private readonly events: RoleEventRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  public async execute(
    command: AssignRoleToMembership,
  ): Promise<Result<MembershipRoleView, DomainError>> {
    const {
      tenantId: rawTenantId,
      membershipId: rawMembershipId,
      roleId: rawRoleId,
    } = command.payload;

    if (!isMembershipId(rawMembershipId)) {
      return Result.fail(new MembershipNotFoundError());
    }
    if (!isRoleId(rawRoleId)) {
      return Result.fail(new RoleNotFoundError());
    }

    const tenantId = resolveScopedTenant(rawTenantId);
    if (tenantId.isFail()) {
      return Result.fail(tenantId.errorOrThrow());
    }

    const membershipId = membershipIdFrom(rawMembershipId);
    const roleId = roleIdFrom(rawRoleId);
    const scopeTenant = tenantId.valueOrThrow().value;

    return this.boundary.execute<Result<MembershipRoleView, DomainError>>(async () => {
      const membership = await this.memberships.get(membershipId);
      if (membership === undefined || membership.aggregate.tenantId.value !== scopeTenant) {
        return Result.fail(new MembershipNotFoundError());
      }

      const role = await this.roles.get(roleId);
      if (role === undefined || role.aggregate.tenantId.value !== scopeTenant) {
        return Result.fail(new RoleNotFoundError());
      }
      if (!role.aggregate.isActive()) {
        return Result.fail(new InactiveRoleError());
      }

      const now = DateTime.now();
      const existing = await this.assignments.findPair(membershipId, roleId);

      if (existing !== undefined) {
        if (existing.aggregate.isActive()) {
          return Result.fail(new DuplicateRoleAssignmentError(membershipId.value, roleId.value));
        }

        const assignment = existing.aggregate;
        assignment.activate(now);

        let reactivated: WriteReceipt;
        try {
          reactivated = await this.assignments.update(assignment, existing.revision);
        } catch (error) {
          const conflict = toConflict(error);
          if (conflict !== undefined) {
            return Result.fail(conflict);
          }
          throw error;
        }

        await this.events.record(
          new RoleAssigned(
            {
              assignmentId: assignment.assignmentId(),
              tenantId: assignment.tenantId.value,
              membershipId: assignment.membershipId.value,
              roleId: assignment.roleId.value,
            },
            tenantScopedMessageOptions(causedBy(command)),
          ),
        );

        return Result.ok(
          toMembershipRoleView(
            { aggregate: assignment, revision: reactivated.revision },
            role.aggregate,
          ),
        );
      }

      const assignment = MembershipRole.assign({
        tenantId: tenantId.valueOrThrow(),
        membershipId,
        roleId,
        now,
      });

      let receipt: WriteReceipt;
      try {
        receipt = await this.assignments.add(assignment);
      } catch (error) {
        if (toConflict(error) !== undefined) {
          return Result.fail(new DuplicateRoleAssignmentError(membershipId.value, roleId.value));
        }
        throw error;
      }

      await this.events.record(
        new RoleAssigned(
          {
            assignmentId: assignment.assignmentId(),
            tenantId: assignment.tenantId.value,
            membershipId: assignment.membershipId.value,
            roleId: assignment.roleId.value,
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
