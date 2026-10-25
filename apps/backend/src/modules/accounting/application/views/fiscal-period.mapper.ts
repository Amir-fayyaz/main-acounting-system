import type { FiscalPeriod } from '../../domain/aggregates/fiscal-period.js';
import type { FiscalPeriodView } from './fiscal-period.view.js';

/**
 * Maps loaded domain state to the application view (FIS-004).
 *
 * The mapping is one-way and total: it reads the aggregate and produces plain
 * values. Nothing here can write back into the aggregate, and a caller that
 * wants to change something must go through a use case.
 */
export function toFiscalPeriodView(fiscalPeriod: FiscalPeriod): FiscalPeriodView {
  const range = fiscalPeriod.range.toJSON();

  return {
    id: fiscalPeriod.id.value,
    tenantId: fiscalPeriod.tenantId.value,
    fiscalYearId: fiscalPeriod.fiscalYearId.value,
    jalaliYear: fiscalPeriod.jalaliYear,
    sequence: fiscalPeriod.sequence,
    startDate: range.startDate,
    endDate: range.endDate,
    state: fiscalPeriod.state.value,
    createdAt: fiscalPeriod.createdAt.toIsoString(),
    updatedAt: fiscalPeriod.updatedAt.toIsoString(),
  };
}
