import type {
  AddsAggregate,
  Loaded,
  LoadsById,
  UpdatesAggregate,
} from '../../../../shared/persistence/repository-ports.js';
import type { FiscalPeriod } from '../aggregates/fiscal-period.js';
import type { FiscalYearId } from '../value-objects/fiscal-year-id.js';
import type { FiscalPeriodId } from '../value-objects/fiscal-period-id.js';
import type { TenantReference } from '../value-objects/tenant-reference.js';

/**
 * The fiscal period persistence port (FIS-004; SHR-004; ADR-003 sections 4
 * and 25).
 *
 * The port is the *whole* view this module's Domain and use cases have of
 * period storage: load one by identity, list one fiscal year's periods,
 * insert one, update one against the revision it was read at (the update
 * exists for the closing actor FIS-005 introduces). It is composed from the
 * shared capabilities rather than written by hand, so it cannot grow a generic
 * query, a delete or an upsert by accident.
 *
 * `findByYear` is the closed-criteria read the generation rule needs: the
 * periods of one fiscal year, in sequence order, already scoped to one tenant.
 * It is tenant-scoped like every read of a tenant-owned row — the adapter
 * compares the criterion with the ambient scope and refuses a foreign tenant,
 * so one company can never enumerate another's periods (IAM-007).
 *
 * The idempotency of generation is defended at both ends: the policy declines
 * an already-planned year in memory, and the adapter rejects a duplicate
 * `(tenant_id, fiscal_year_id, sequence)` through the store's own unique key.
 */
export interface FiscalPeriodRepository
  extends LoadsById<FiscalPeriodId, FiscalPeriod>,
    AddsAggregate<FiscalPeriod>,
    UpdatesAggregate<FiscalPeriod> {
  /**
   * Every fiscal period of one fiscal year, ordered by sequence.
   *
   * @throws TenantIsolationViolationError — the criterion names a tenant other
   * than the active scope (fail closed, IAM-007).
   */
  findByYear(
    fiscalYearId: FiscalYearId,
    tenantId: TenantReference,
  ): Promise<readonly Loaded<FiscalPeriod>[]>;
}
