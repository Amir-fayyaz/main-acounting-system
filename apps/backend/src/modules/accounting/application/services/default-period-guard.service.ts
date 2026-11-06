import type { EntityId } from '../../../../shared/id/entity-id.js';
import { BusinessDate } from '../../../../shared/time/business-date.js';
import { tenantReferenceFrom } from '../../domain/value-objects/tenant-reference.js';
import type { FiscalPeriodRepository } from '../../domain/repositories/fiscal-period.repository.js';
import {
  PeriodClosedError,
  PeriodNotDefinedError,
} from '../../domain/errors/fiscal-period.errors.js';
import type { PeriodGuard, PostablePeriod } from '../ports/period-guard.port.js';

export class DefaultPeriodGuard implements PeriodGuard {
  public constructor(private readonly periods: FiscalPeriodRepository) {}

  public async assertPostable(
    tenant: EntityId | string,
    date: Date | BusinessDate,
  ): Promise<PostablePeriod> {
    const tenantRef = tenantReferenceFrom(typeof tenant === 'string' ? tenant : tenant.value);
    const businessDate =
      date instanceof BusinessDate ? date : BusinessDate.fromUtcMillis(date.getTime());

    // Resolves period with row-level lock (FOR SHARE) to prevent concurrent closing race with FIS-005
    const loaded = await this.periods.findPeriodForDate(tenantRef, businessDate, {
      forShare: true,
    });

    if (loaded === undefined) {
      throw new PeriodNotDefinedError(
        `No fiscal period is defined for date ${businessDate.toIsoString()} in this company.`,
      );
    }

    const period = loaded.aggregate;

    if (!period.isOpen()) {
      throw new PeriodClosedError(
        `The fiscal period for date ${businessDate.toIsoString()} is closed and cannot be posted into.`,
      );
    }

    return {
      id: period.id.value,
      fiscalYearId: period.fiscalYearId.value,
      sequence: period.sequence,
      startDate: period.range.startDate.toIsoString(),
      endDate: period.range.endDate.toIsoString(),
    };
  }
}
