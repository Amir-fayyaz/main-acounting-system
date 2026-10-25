import { DomainEvent } from '../../../../shared/messaging/domain-event.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/**
 * The facts the accounting module publishes about fiscal periods (FIS-004;
 * the domain map names Fiscal Period as an object of Accounting; ADR-005).
 *
 * Their bodies are plain, self-contained values — never the aggregate itself —
 * so the record of what happened cannot be edited after the fact and no
 * consumer receives a live object it might mutate. Each is raised by a use
 * case only after the state change actually happened, and travels through the
 * outbox in the same transaction (SHR-006).
 *
 * Names are past tense because an event is a fact; the kernel refuses anything
 * else. Closing a period is FIS-005 and adds its own event there.
 */

/** The information `FiscalPeriodsGenerated` carries. */
export interface FiscalPeriodsGeneratedData {
  readonly tenantId: string;
  readonly fiscalYearId: string;
  /** The Jalali calendar year the periods belong to. */
  readonly jalaliYear: number;
  /** The twelve periods in calendar order, by sequence and day range. */
  readonly periods: readonly {
    readonly fiscalPeriodId: string;
    readonly sequence: number;
    readonly startDate: string;
    readonly endDate: string;
  }[];
}

/** Creating a fiscal year generated its twelve monthly periods. */
export class FiscalPeriodsGenerated extends DomainEvent<FiscalPeriodsGeneratedData> {
  public constructor(data: FiscalPeriodsGeneratedData, options?: MessageOptions) {
    super('FiscalPeriodsGenerated', data, options);
  }
}

/** The information `ActivePeriodSelected` carries. */
export interface ActivePeriodSelectedData {
  readonly tenantId: string;
  readonly fiscalPeriodId: string;
  readonly fiscalYearId: string;
  readonly sequence: number;
}

/**
 * A period became the tenant's single active one, replacing whichever period
 * held the flag before (FIS-004).
 */
export class ActivePeriodSelected extends DomainEvent<ActivePeriodSelectedData> {
  public constructor(data: ActivePeriodSelectedData, options?: MessageOptions) {
    super('ActivePeriodSelected', data, options);
  }
}
