import type { BusinessDate } from '../../../../shared/time/business-date.js';
import type { EntityId } from '../../../../shared/id/entity-id.js';

export interface PostablePeriod {
  readonly id: string;
  readonly fiscalYearId: string;
  readonly sequence: number;
  readonly startDate: string;
  readonly endDate: string;
}

export interface PeriodGuard {
  /**
   * Asserts whether a business date may be posted into for the given tenant (FIS-006).
   *
   * @param tenant The tenant identity (EntityId or string).
   * @param date The posting date (JavaScript Date or civil BusinessDate).
   * @returns The resolved postable period.
   * @throws PeriodNotDefinedError when the date falls outside every fiscal period.
   * @throws PeriodClosedError when the date falls into an already closed period.
   */
  assertPostable(tenant: EntityId | string, date: Date | BusinessDate): Promise<PostablePeriod>;
}
