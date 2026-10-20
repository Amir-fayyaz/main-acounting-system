import type { MembershipId } from '../../domain/value-objects/membership-id.js';
import type { TenantReference } from '../../domain/value-objects/tenant-reference.js';
import type { UserId } from '../../domain/value-objects/user-id.js';

/**
 * The minimum evidence authorization needs from an active user/tenant relationship.
 * The aggregate itself remains owned by the Membership feature.
 */
export interface ActiveTenantMembership {
  readonly membershipId: MembershipId;
  readonly tenantId: TenantReference;
}

/**
 * Application-facing contract for answering whether a user has active access to a tenant.
 * A missing or inactive relationship is returned as `undefined` so callers cannot distinguish
 * membership state by branching on different storage outcomes.
 */
export interface TenantMembership {
  findActiveForUserAndTenant(
    userId: UserId,
    tenantId: TenantReference,
  ): Promise<ActiveTenantMembership | undefined>;
}
