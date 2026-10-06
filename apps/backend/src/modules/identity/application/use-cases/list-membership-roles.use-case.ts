import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { MembershipNotFoundError } from '../../domain/errors/membership.errors.js';
import type { MembershipRoleRepository } from '../../domain/repositories/membership-role.repository.js';
import type { MembershipRepository } from '../../domain/repositories/membership.repository.js';
import type { RoleRepository } from '../../domain/repositories/role.repository.js';
import { isMembershipId, membershipIdFrom } from '../../domain/value-objects/membership-id.js';
import type { ListMembershipRoles } from '../queries/list-membership-roles.query.js';
import { resolveScopedTenant } from '../services/tenant-scope.js';
import { toMembershipRoleView } from '../views/role.mapper.js';
import type { MembershipRoleView } from '../views/membership-role.view.js';

/**
 * Reads the roles held by one Membership (IAM-004).
 *
 * The read is tenant-scoped and the membership must belong to the scoped tenant,
 * so it cannot bypass the tenant boundary. Every assignment is returned with its
 * current state — active or removed — so a caller sees the access *history*, not
 * just the roles in force; effective-permission resolution is the query that
 * filters to what is currently held.
 */
export class ListMembershipRolesUseCase {
  public constructor(
    private readonly memberships: MembershipRepository,
    private readonly assignments: MembershipRoleRepository,
    private readonly roles: RoleRepository,
  ) {}

  public async execute(
    query: ListMembershipRoles,
  ): Promise<Result<readonly MembershipRoleView[], DomainError>> {
    const rawMembershipId = query.params.membershipId;
    if (!isMembershipId(rawMembershipId)) {
      return Result.fail(new MembershipNotFoundError());
    }

    const tenantId = resolveScopedTenant(query.params.tenantId);
    if (tenantId.isFail()) {
      return Result.fail(tenantId.errorOrThrow());
    }

    const membershipId = membershipIdFrom(rawMembershipId);
    const membership = await this.memberships.get(membershipId);
    if (
      membership === undefined ||
      membership.aggregate.tenantId.value !== tenantId.valueOrThrow().value
    ) {
      return Result.fail(new MembershipNotFoundError());
    }

    const loaded = await this.assignments.findByMembershipId(membershipId);
    const views: MembershipRoleView[] = [];

    for (const assignment of loaded) {
      const role = await this.roles.get(assignment.aggregate.roleId);
      if (role !== undefined) {
        views.push(toMembershipRoleView(assignment, role.aggregate));
      }
    }

    return Result.ok(views);
  }
}
