import type { MembershipRoleStatusValue } from '../../domain/value-objects/membership-role-status.js';
import type { RoleStatusValue } from '../../domain/value-objects/role-status.js';

/**
 * The application-level representation of a Membership-Role assignment (IAM-004).
 *
 * It names the assignment, the role it holds and the role's current name and
 * state, so a client showing "the roles of this membership" does not have to
 * join the role itself for the common case. `status` is the *assignment* state
 * (is the role currently held?) and `roleStatus` is the *role* state (is the role
 * itself in use?) — they are deliberately separate, because a role can be
 * deactivated while its assignments remain as history.
 *
 * `revision` is the token a client sends back when removing the role, so
 * optimistic concurrency is usable across the HTTP boundary (SHR-008).
 */
export interface MembershipRoleView {
  /** The stable assignment identity. */
  readonly id: string;
  /** The membership that holds (or held) the role. */
  readonly membershipId: string;
  /** The role that is (or was) held. */
  readonly roleId: string;
  /** The role's current name. */
  readonly roleName: string;
  /** The role's own lifecycle state (distinct from the assignment's). */
  readonly roleStatus: RoleStatusValue;
  /** The assignment lifecycle state: whether the role is currently held. */
  readonly status: MembershipRoleStatusValue;
  /** The revision to send as `expectedRevision` when removing the role. */
  readonly revision: number;
  /** When the assignment was created, ISO-8601 in UTC. */
  readonly createdAt: string;
  /** When the assignment last changed, ISO-8601 in UTC. */
  readonly updatedAt: string;
}
