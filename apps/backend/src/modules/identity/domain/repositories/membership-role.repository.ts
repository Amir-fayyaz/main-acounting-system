import type {
  AddsAggregate,
  Loaded,
  LoadsById,
  UpdatesAggregate,
} from '../../../../shared/persistence/repository-ports.js';
import type { MembershipRole } from '../aggregates/membership-role.js';
import type { MembershipId } from '../value-objects/membership-id.js';
import type { MembershipRoleId } from '../value-objects/membership-role-id.js';
import type { RoleId } from '../value-objects/role-id.js';

/**
 * The Identity module's repository for Membership-Role assignments (IAM-004;
 * SHR-004).
 *
 * It is assembled from the shared persistence capabilities plus the two closed
 * criteria this issue needs: the assignments of one membership, and the single
 * assignment (in any state) for a (membership, role) pair — the latter is what
 * lets a re-assignment reactivate the preserved record instead of creating a
 * second one.
 *
 * There is no delete: removing a role deactivates its assignment, so the write
 * is `update(aggregate, expectedRevision)` and a lost race is refused rather
 * than overwriting the winner.
 *
 * The interface lives in `domain/`; the implementation lives in
 * `infrastructure/persistence/` and is never exposed outside this module
 * (ADR-002 section 8; enforced by `src/modules/module-boundaries.spec.ts`).
 */
export interface MembershipRoleRepository
  extends
    LoadsById<MembershipRoleId, MembershipRole>,
    AddsAggregate<MembershipRole>,
    UpdatesAggregate<MembershipRole> {
  /**
   * Every role assignment of one membership, whatever its state.
   *
   * State is deliberately not part of the criterion: effective-permission
   * resolution filters to active assignments itself, and the list is also how a
   * caller sees the history.
   */
  findByMembershipId(membershipId: MembershipId): Promise<readonly Loaded<MembershipRole>[]>;

  /**
   * The one assignment (in any state) for a (membership, role) pair, or
   * `undefined` when the role was never assigned to the membership.
   *
   * Absence of the pair is what allows a first assignment; an existing inactive
   * assignment is what turns a re-assignment into reactivation.
   */
  findPair(membershipId: MembershipId, roleId: RoleId): Promise<Loaded<MembershipRole> | undefined>;
}
