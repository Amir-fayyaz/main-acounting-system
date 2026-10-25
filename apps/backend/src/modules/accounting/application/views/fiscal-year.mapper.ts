import type { Loaded } from '../../../../shared/persistence/repository-ports.js';
import type { FiscalYear } from '../../domain/aggregates/fiscal-year.js';
import type { FiscalYearView } from './fiscal-year.view.js';

/**
 * Maps loaded domain state to the application view (FIS-002).
 *
 * The mapping is one-way and total: it reads the aggregate and its revision and
 * produces plain values. Nothing here can write back into the aggregate, and a
 * caller that wants to change something must go through a use case.
 */
export function toFiscalYearView(loaded: Loaded<FiscalYear>): FiscalYearView {
  const { aggregate: fiscalYear, revision } = loaded;
  const range = fiscalYear.range.toJSON();

  return {
    id: fiscalYear.id.value,
    tenantId: fiscalYear.tenantId.value,
    label: fiscalYear.label.value,
    startDate: range.startDate,
    endDate: range.endDate,
    status: fiscalYear.status.value,
    revision: revision.value,
    createdAt: fiscalYear.createdAt.toIsoString(),
    updatedAt: fiscalYear.updatedAt.toIsoString(),
  };
}
