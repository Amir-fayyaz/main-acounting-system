import type { EntityId } from '../../../../shared/id/entity-id.js';
import type {
  AddsAggregate,
  Loaded,
  LoadsById,
  UpdatesAggregate,
} from '../../../../shared/persistence/repository-ports.js';
import type { Revision } from '../../../../shared/persistence/revision.js';
import type { Account } from '../aggregates/account.js';
import type { TenantReference } from '../value-objects/tenant-reference.js';

/**
 * The account persistence port (ACC-001.2; SHR-004, SHR-008; ADR-002 section 8;
 * ADR-003 sections 4, 14 and 25).
 *
 * The port is the *whole* view this module's Domain and use cases have of
 * chart-of-accounts storage: load one account by identity, read one tenant's
 * chart as a tree, insert one, update one against the revision it was read at.
 * It is composed from the shared capabilities rather than written by hand, so
 * it cannot grow a generic query, a delete or an upsert by accident — and a lost
 * race is reported through the shared optimistic-concurrency mechanism rather
 * than a module-local convention (SHR-008).
 *
 * Three properties carry over from the capabilities:
 *
 * - **Absence is `undefined`, not an error.** Whether a missing account is a
 *   404 for a caller is a business decision the use case makes, not one storage
 *   invents.
 * - **Change requires the expected revision.** `update` takes the revision the
 *   caller read; the adapter refuses the write if it moved, so a concurrent
 *   change surfaces as a conflict instead of an overwrite.
 * - **No delete.** An account is deactivated (`active = false`), never removed:
 *   it carries operational history (ADR-003 sections 10–11).
 *
 * Reads that name a tenant (`findByTenant`, `loadTree`) are tenant-scoped like
 * every read of a tenant-owned row — the adapter compares the criterion with the
 * ambient scope and refuses a foreign tenant, so one company can never enumerate
 * another's chart (IAM-007; doc 26).
 *
 * The interface lives here; the Drizzle/MySQL implementation lives in this
 * module's `infrastructure/persistence/` and no other module may import either
 * (enforced by `src/modules/module-boundaries.spec.ts`).
 */

/**
 * One account in a loaded tree, with the revision it was read at and its
 * direct children.
 *
 * The children are the same kind of node, so the shape is recursive and carries
 * the whole hierarchy the domain's parent/level invariant describes. A node is
 * immutable: a caller that changes an account works on the aggregate and writes
 * it back through `update`, it does not mutate the tree.
 */
export interface AccountTreeNode {
  /** The rehydrated aggregate, ready for Domain operations. */
  readonly account: Account;
  /** The revision the account was stored at (SHR-008). */
  readonly revision: Revision;
  /** Direct children, ordered by account code. Empty for a leaf. */
  readonly children: readonly AccountTreeNode[];
}

export interface AccountRepository
  extends LoadsById<EntityId, Account>, AddsAggregate<Account>, UpdatesAggregate<Account> {
  /**
   * Every account of one tenant as a flat list, ordered by code.
   *
   * One query, no per-row follow-up. Used where the caller needs a sorted set
   * rather than the hierarchy — a code search, a picker, a duplicate probe.
   *
   * @throws TenantIsolationViolationError — the criterion names a tenant other
   * than the active scope (fail closed, IAM-007).
   * @throws TenantContextMissingError — no tenant scope is established.
   */
  findByTenant(tenantId: TenantReference): Promise<readonly Loaded<Account>[]>;

  /**
   * The whole chart of accounts of one tenant, assembled as a tree.
   *
   * Implemented as **one** query over the tenant's accounts followed by an
   * in-memory assembly, so a chart of any depth costs one round trip and never
   * an N+1 walk. Roots are returned in code order and every `children` list is
   * in code order too, so the result is deterministic rather than dependent on
   * storage's physical order.
   *
   * The database's composite parent foreign key means every non-null parent is
   * an account of this same tenant, so no node can “escape” the tree; a row
   * whose parent is missing cannot be stored in the first place.
   *
   * @throws TenantIsolationViolationError — the criterion names a tenant other
   * than the active scope (fail closed, IAM-007).
   * @throws TenantContextMissingError — no tenant scope is established.
   */
  loadTree(tenantId: TenantReference): Promise<readonly AccountTreeNode[]>;
}
