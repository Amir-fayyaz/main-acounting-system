import type {
  AddsAggregate,
  LoadsById,
  UpdatesAggregate,
} from '../../../../shared/persistence/repository-ports.js';
import type { Loaded } from '../../../../shared/persistence/repository-ports.js';
import type { FiscalYear } from '../aggregates/fiscal-year.js';
import type { FiscalYearId } from '../value-objects/fiscal-year-id.js';
import type { TenantReference } from '../value-objects/tenant-reference.js';

/**
 * The fiscal year persistence port (FIS-002; SHR-004; ADR-002 section 8;
 * ADR-003 sections 4, 14 and 25).
 *
 * The port is the *whole* view this module's Domain and use cases have of
 * fiscal year storage: load one by identity, list one tenant's years, insert
 * one, update one against the revision it was read at. It is composed from the
 * shared capabilities rather than written by hand, so it cannot grow a generic
 * query, a delete or an upsert by accident — and a lost race is reported
 * through the shared optimistic-concurrency mechanism rather than a
 * module-local convention (SHR-008).
 *
 * Two properties carry over from the capabilities:
 *
 * - **Absence is `undefined`, not an error.** Whether a missing year is a
 *   404 for a caller is a business decision the use case makes, not one
 *   storage invents.
 * - **Change requires the expected revision.** `update` takes the revision the
 *   caller read; the adapter refuses the write if it moved, so a concurrent
 *   change surfaces as a conflict instead of an overwrite.
 *
 * `findByTenant` is the closed-criteria read the overlap rule needs: the
 * tenant's years, in start-date order. It is tenant-scoped like every read of
 * a tenant-owned row — the adapter compares the criterion with the ambient
 * scope and refuses a foreign tenant, so one company can never enumerate
 * another's years (IAM-007).
 *
 * The interface lives here; the Drizzle/MySQL implementation lives in this
 * module's `infrastructure/persistence/` and no other module may import either
 * (enforced by `src/modules/module-boundaries.spec.ts`).
 */
export interface FiscalYearRepository
  extends LoadsById<FiscalYearId, FiscalYear>,
    AddsAggregate<FiscalYear>,
    UpdatesAggregate<FiscalYear> {
  /**
   * Every fiscal year of one tenant, ordered by start date.
   *
   * Ordered so callers — the overlap probe above all — see a deterministic
   * sequence rather than storage's insertion order.
   *
   * @throws TenantIsolationViolationError — the criterion names a tenant other
   * than the active scope (fail closed, IAM-007).
   */
  findByTenant(tenantId: TenantReference): Promise<readonly Loaded<FiscalYear>[]>;
}
