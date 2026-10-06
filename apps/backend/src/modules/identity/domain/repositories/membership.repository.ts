import type {
  AddsAggregate,
  Loaded,
  LoadsById,
  UpdatesAggregate,
} from '../../../../shared/persistence/repository-ports.js';
import type { Membership } from '../aggregates/membership.js';
import type { MembershipId } from '../value-objects/membership-id.js';
import type { TenantReference } from '../value-objects/tenant-reference.js';
import type { UserId } from '../value-objects/user-id.js';

/**
 * The Identity module's repository for Memberships (IAM-003; SHR-004).
 *
 * It is assembled from the shared persistence capabilities (`LoadsById`,
 * `AddsAggregate`, `UpdatesAggregate`) plus the closed criteria this issue
 * needs: the uniqueness check for one (User, Tenant) pair, the memberships of a
 * user, and the members of a tenant. There is no generic query, no delete and no
 * upsert: a membership is deactivated, never removed, and a write names the
 * revision it expects.
 *
 * The two read criteria are deliberately narrow, closed types owned by this
 * module (`UserId`, `TenantReference`), not an expression the adapter would have
 * to interpret — the port grows with decisions, not with curiosity (ADR-003
 * sections 4 and 25).
 *
 * The interface lives in `domain/`; the implementation lives in
 * `infrastructure/persistence/` and is never exposed outside this module
 * (ADR-002 section 8; enforced by `src/modules/module-boundaries.spec.ts`).
 */
export interface MembershipRepository
  extends
    LoadsById<MembershipId, Membership>,
    AddsAggregate<Membership>,
    UpdatesAggregate<Membership> {
  /**
   * Whether a membership for this (User, Tenant) pair already exists, in any
   * lifecycle state.
   *
   * State is deliberately not part of the criterion: at most one record is kept
   * per pair, so a re-join reactivates the existing record instead of creating a
   * second one, and the check answers for the record's existence, not its state.
   */
  existsForPair(userId: UserId, tenantId: TenantReference): Promise<boolean>;

  /** Every membership of one user, whatever its state. */
  findByUserId(userId: UserId): Promise<readonly Loaded<Membership>[]>;

  /** Every membership of one tenant, whatever its state. */
  findByTenantId(tenantId: TenantReference): Promise<readonly Loaded<Membership>[]>;
}
