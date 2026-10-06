import type { MembershipStatusValue } from '../../domain/value-objects/membership-status.js';
import type { UserStatusValue } from '../../domain/value-objects/user-status.js';

/**
 * The application-level representation of a Tenant's member (IAM-003).
 *
 * Reading the members of a tenant means reading *users through their
 * memberships*: the membership supplies the relationship and its lifecycle
 * state, and the referenced user supplies the display attributes a caller
 * actually wants to see. The view keeps the two visibly separate — membership
 * state is never conflated with user state — so a client can tell an inactive
 * membership apart from an inactive user.
 *
 * The user attributes are read from the user record at read time; nothing is
 * copied into the membership itself, so a rename is reflected the next time the
 * members are read rather than stored twice.
 */
export interface TenantMemberView {
  /** The stable membership identity. */
  readonly membershipId: string;
  /** The membership lifecycle state. */
  readonly status: MembershipStatusValue;
  /** The stable user identity behind the membership. */
  readonly userId: string;
  /** The user's current display name. */
  readonly displayName: string;
  /** The user's current primary contact email. */
  readonly email: string;
  /** The user's own lifecycle state (distinct from the membership's). */
  readonly userStatus: UserStatusValue;
  /** The revision to send as `expectedRevision` on the membership's next change. */
  readonly revision: number;
  /** When the membership was created, ISO-8601 in UTC. */
  readonly createdAt: string;
  /** When the membership last changed, ISO-8601 in UTC. */
  readonly updatedAt: string;
}
