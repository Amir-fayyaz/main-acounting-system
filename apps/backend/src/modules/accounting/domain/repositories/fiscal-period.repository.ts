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
import type { BusinessDate } from '../../../../shared/time/business-date.js';

export interface FiscalPeriodRepository
  extends
    LoadsById<FiscalPeriodId, FiscalPeriod>,
    AddsAggregate<FiscalPeriod>,
    UpdatesAggregate<FiscalPeriod> {
  findByYear(
    fiscalYearId: FiscalYearId,
    tenantId: TenantReference,
  ): Promise<readonly Loaded<FiscalPeriod>[]>;

  /**
   * Finds the fiscal period covering `date` for `tenantId` (FIS-006).
   *
   * @param options.forShare when true, acquires a shared read lock (FOR SHARE)
   * in MySQL so a concurrent close is serialized behind any active posting
   * transaction.
   */
  findPeriodForDate(
    tenantId: TenantReference,
    date: BusinessDate,
    options?: { readonly forShare?: boolean },
  ): Promise<Loaded<FiscalPeriod> | undefined>;
}
