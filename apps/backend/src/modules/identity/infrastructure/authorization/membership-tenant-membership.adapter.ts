import type {
  ActiveTenantMembership,
  TenantMembership,
} from '../../application/ports/tenant-membership.port.js';
import type { MembershipRepository } from '../../domain/repositories/membership.repository.js';
import type { TenantReference } from '../../domain/value-objects/tenant-reference.js';
import type { UserId } from '../../domain/value-objects/user-id.js';

/**
 * Adapts the Identity-owned membership repository to the narrow authorization
 * lookup. B-02's membership table and repository are already present, so this is
 * the production adapter; a temporary placeholder adapter is not needed.
 */
export class MembershipTenantMembershipAdapter implements TenantMembership {
  public constructor(private readonly memberships: MembershipRepository) {}

  public async findActiveForUserAndTenant(
    userId: UserId,
    tenantId: TenantReference,
  ): Promise<ActiveTenantMembership | undefined> {
    const found = await this.memberships.findByUserAndTenant(userId, tenantId);
    const membership = found?.aggregate;

    if (membership === undefined || !membership.isActive()) {
      return undefined;
    }

    // Publish only the evidence the authorization decision consumes, not the
    // Membership aggregate or its lifecycle operations.
    return {
      membershipId: membership.id,
      tenantId: membership.tenantId,
    };
  }
}
