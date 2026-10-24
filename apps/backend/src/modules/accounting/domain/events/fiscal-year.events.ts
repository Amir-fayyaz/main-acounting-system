import { DomainEvent } from '../../../../shared/messaging/domain-event.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';
import type { FiscalYearStatusValue } from '../value-objects/fiscal-year-status.js';

/**
 * The facts the accounting module publishes about fiscal years (FIS-002; the
 * domain map names Fiscal Year as an independent domain object of Accounting;
 * ADR-005).
 *
 * Their bodies are plain, self-contained values — never the aggregate itself —
 * so the record of what happened cannot be edited after the fact and no
 * consumer receives a live object it might mutate. Each is raised by a use
 * case only after the state change actually happened, and travels through the
 * outbox in the same transaction (SHR-006).
 *
 * Names are past tense because an event is a fact; the kernel refuses anything
 * else.
 */

/** The information `FiscalYearCreated` carries. */
export interface FiscalYearCreatedData {
  readonly tenantId: string;
  readonly fiscalYearId: string;
  readonly label: string;
  /** Inclusive first day, `YYYY-MM-DD`. */
  readonly startDate: string;
  /** Inclusive last day, `YYYY-MM-DD`. */
  readonly endDate: string;
  readonly status: FiscalYearStatusValue;
}

/** A fiscal year was created within a tenant's fiscal frame. */
export class FiscalYearCreated extends DomainEvent<FiscalYearCreatedData> {
  public constructor(data: FiscalYearCreatedData, options?: MessageOptions) {
    super('FiscalYearCreated', data, options);
  }
}

/** The information `FiscalYearClosed` carries. */
export interface FiscalYearClosedData {
  readonly tenantId: string;
  readonly fiscalYearId: string;
  readonly label: string;
}

/** A fiscal year was taken out of use; its history is retained. */
export class FiscalYearClosed extends DomainEvent<FiscalYearClosedData> {
  public constructor(data: FiscalYearClosedData, options?: MessageOptions) {
    super('FiscalYearClosed', data, options);
  }
}
