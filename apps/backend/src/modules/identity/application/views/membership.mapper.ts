import type { Loaded } from '../../../../shared/persistence/repository-ports.js';
import type { Membership } from '../../domain/aggregates/membership.js';
import type { User } from '../../domain/aggregates/user.js';
import type { MembershipView } from './membership.view.js';
import type { TenantMemberView } from './tenant-member.view.js';

/**
 * Maps loaded membership state to the application views (IAM-003).
 *
 * The mapping is one-way and total: it reads the aggregates and the revision and
 * produces plain values. Nothing here can write back into an aggregate, and a
 * caller that wants to change something must go through a use case.
 */
export function toMembershipView(loaded: Loaded<Membership>): MembershipView {
  const { aggregate: membership, revision } = loaded;

  return {
    id: membership.id.value,
    userId: membership.userId.value,
    tenantId: membership.tenantId.value,
    status: membership.status.value,
    revision: revision.value,
    createdAt: membership.createdAt.toIsoString(),
    updatedAt: membership.updatedAt.toIsoString(),
  };
}

/**
 * Maps a membership plus the user it refers to into the tenant-member view.
 *
 * The user is a separate aggregate read for its display attributes; keeping the
 * two inputs explicit is what makes it impossible to accidentally report a
 * membership's state as the user's, or to copy the user's data into a
 * membership.
 */
export function toTenantMemberView(loaded: Loaded<Membership>, user: User): TenantMemberView {
  const { aggregate: membership, revision } = loaded;

  return {
    membershipId: membership.id.value,
    status: membership.status.value,
    userId: user.id.value,
    displayName: user.displayName.value,
    email: user.email.value,
    userStatus: user.status.value,
    revision: revision.value,
    createdAt: membership.createdAt.toIsoString(),
    updatedAt: membership.updatedAt.toIsoString(),
  };
}
