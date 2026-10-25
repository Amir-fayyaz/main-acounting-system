import type { FiscalPeriodId } from '../value-objects/fiscal-period-id.js';
import type { TenantReference } from '../value-objects/tenant-reference.js';

/**
 * The active-period persistence port (FIS-004).
 *
 * The rule this port exists for is deliberate and narrow: **a tenant has
 * exactly one active period, and it must be open**. The active pointer is not
 * an aggregate with a lifecycle — it is a per-tenant pointer row
 * (`tenant_id` primary key, one `period_id` value), so the port offers exactly
 * two operations and nothing more:
 *
 * - `periodIdFor` — read the current pointer, or `undefined` when the tenant
 *   has never selected a period. It is scoped like every read of a tenant-owned
 *   row (IAM-007).
 * - `activate` — move the pointer to a new period **atomically**: one
 *   insert-or-switch statement that commits the whole move or nothing of it.
 *
 * This is the one deliberate insert-or-switch in the module (ADR-004 section
 * 27 refuses silent upserts for *financial records*): a pointer that must move
 * as a single atomic fact, selected twice concurrently, would otherwise be two
 * writes racing — and neither the old period of one writer nor the new period
 * of the other may be left active. The target period's `open` state is not
 * checked here; that is the use case's business decision, at the revision it
 * read. The adapter defends only the storage rule: at most one pointer row per
 * tenant.
 */
export interface ActivePeriodRepository {
  /**
   * The active period's identity of one tenant, or `undefined` when none has
   * been selected yet.
   *
   * @throws TenantIsolationViolationError — the criterion names a tenant other
   * than the active scope (fail closed, IAM-007).
   */
  periodIdFor(tenantId: TenantReference): Promise<FiscalPeriodId | undefined>;

  /**
   * Makes `periodId` the tenant's single active period, atomically replacing
   * whichever period was active before.
   *
   * @throws TenantIsolationViolationError — the criterion names a tenant other
   * than the active scope (fail closed, IAM-007).
   */
  activate(tenantId: TenantReference, periodId: FiscalPeriodId): Promise<void>;
}
