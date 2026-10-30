import { DomainEvent } from '../../../../shared/messaging/domain-event.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

export interface FiscalPeriodsGeneratedData {
  readonly tenantId: string;
  readonly fiscalYearId: string;
  readonly jalaliYear: number;
  readonly periods: readonly {
    readonly fiscalPeriodId: string;
    readonly sequence: number;
    readonly startDate: string;
    readonly endDate: string;
  }[];
}

export class FiscalPeriodsGenerated extends DomainEvent<FiscalPeriodsGeneratedData> {
  public constructor(data: FiscalPeriodsGeneratedData, options?: MessageOptions) {
    super('FiscalPeriodsGenerated', data, options);
  }
}

export interface ActivePeriodSelectedData {
  readonly tenantId: string;
  readonly fiscalPeriodId: string;
  readonly fiscalYearId: string;
  readonly sequence: number;
}

export class ActivePeriodSelected extends DomainEvent<ActivePeriodSelectedData> {
  public constructor(data: ActivePeriodSelectedData, options?: MessageOptions) {
    super('ActivePeriodSelected', data, options);
  }
}

export interface FiscalPeriodClosedData {
  readonly tenantId: string;
  readonly fiscalPeriodId: string;
  readonly fiscalYearId: string;
  readonly sequence: number;
  readonly closedByUserId?: string;
}

export class FiscalPeriodClosed extends DomainEvent<FiscalPeriodClosedData> {
  public constructor(data: FiscalPeriodClosedData, options?: MessageOptions) {
    super('FiscalPeriodClosed', data, options);
  }
}

export interface FiscalPeriodReopenedData {
  readonly tenantId: string;
  readonly fiscalPeriodId: string;
  readonly fiscalYearId: string;
  readonly sequence: number;
  readonly reason: string;
  readonly reopenedByUserId?: string;
}

export class FiscalPeriodReopened extends DomainEvent<FiscalPeriodReopenedData> {
  public constructor(data: FiscalPeriodReopenedData, options?: MessageOptions) {
    super('FiscalPeriodReopened', data, options);
  }
}
