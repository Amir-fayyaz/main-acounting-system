import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import type { MembershipRepository } from '../../domain/repositories/membership.repository.js';
import type { UserRepository } from '../../domain/repositories/user.repository.js';
import type { ListTenantMembers } from '../queries/list-tenant-members.query.js';
import { resolveMembershipTenant } from '../services/membership-scope.js';
import { toTenantMemberView } from '../views/membership.mapper.js';
import type { TenantMemberView } from '../views/tenant-member.view.js';

/**
 * Reads the users associated with a Tenant through their memberships (IAM-003).
 *
 * The read is tenant-scoped: the tenant is resolved from the ambient tenant
 * scope and checked against the requested one, so it cannot bypass the tenant
 * boundary and browse another tenant's members. For each membership the
 * referenced user is loaded from this module's own user store — the relationship
 * supplies the pairing and the lifecycle state, and the user supplies the
 * display attributes — so the result reflects *current* membership state and
 * *current* user data, with nothing duplicated into the membership.
 *
 * A membership whose user record cannot be found is skipped rather than
 * fabricated: a relationship pointing at a missing identity is a broken record,
 * and inventing a placeholder would hide it.
 */
export class ListTenantMembersUseCase {
  public constructor(
    private readonly repository: MembershipRepository,
    private readonly users: UserRepository,
  ) {}

  public async execute(
    query: ListTenantMembers,
  ): Promise<Result<readonly TenantMemberView[], DomainError>> {
    const tenantId = resolveMembershipTenant(query.params.tenantId);
    if (tenantId.isFail()) {
      return Result.fail(tenantId.errorOrThrow());
    }

    const loaded = await this.repository.findByTenantId(tenantId.valueOrThrow());
    const members: TenantMemberView[] = [];

    for (const membership of loaded) {
      const user = await this.users.get(membership.aggregate.userId);
      if (user !== undefined) {
        members.push(toTenantMemberView(membership, user.aggregate));
      }
    }

    return Result.ok(members);
  }
}
