import type { EntityId } from '../../../../shared/id/entity-id.js';
import type { Loaded, WriteReceipt } from '../../../../shared/persistence/repository-ports.js';
import type { Revision } from '../../../../shared/persistence/revision.js';
import type { FiscalPeriod } from '../aggregates/fiscal-period.js';
import type { FiscalYearId } from '../value-objects/fiscal-year-id.js';
import type { TenantReference } from '../value-objects/tenant-reference.js';

export interface FiscalPeriodRepository {
  get(id: EntityId): Promise<Loaded<FiscalPeriod> | undefined>;
  findByYear(fiscalYearId: FiscalYearId): Promise<readonly Loaded<FiscalPeriod>[]>;
  findActive(tenantId: TenantReference): Promise<Loaded<FiscalPeriod> | undefined>;
  addMany(periods: readonly FiscalPeriod[]): Promise<void>;
  update(period: FiscalPeriod, expectedRevision: Revision): Promise<WriteReceipt>;
  setActive(periodId: EntityId, tenantId: TenantReference): Promise<void>;
}
