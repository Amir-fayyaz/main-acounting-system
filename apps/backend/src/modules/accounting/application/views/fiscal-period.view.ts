import type { FiscalPeriod } from '../../domain/aggregates/fiscal-period.js';
import type { Loaded } from '../../../../shared/persistence/repository-ports.js';

export interface FiscalPeriodView {
  readonly id: string;
  readonly tenantId: string;
  readonly fiscalYearId: string;
  readonly sequenceNumber: number;
  readonly label: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: 'open' | 'closed';
  readonly isActive: boolean;
  readonly reopenReason?: string;
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toFiscalPeriodView(loaded: Loaded<FiscalPeriod>): FiscalPeriodView {
  const p = loaded.aggregate;
  return {
    id: p.id.value,
    tenantId: p.tenantId.value,
    fiscalYearId: p.fiscalYearId.value,
    sequenceNumber: p.sequenceNumber,
    label: p.label,
    startDate: p.startDate.toIsoString(),
    endDate: p.endDate.toIsoString(),
    status: p.status,
    isActive: p.isActive,
    reopenReason: p.reopenReason,
    revision: loaded.revision.value,
    createdAt: p.createdAt.toIsoString(),
    updatedAt: p.updatedAt.toIsoString(),
  };
}
