import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';
import { Query } from '../../../../shared/messaging/query.js';

/** The input `ListFiscalPeriods` needs. */
export interface ListFiscalPeriodsParams {
  /** The fiscal year whose periods are listed; must belong to the tenant scope. */
  readonly fiscalYearId: string;
}

/**
 * The request to list one fiscal year's periods (FIS-004; SHR-003).
 *
 * A query is side-effect free: it reads current state and never changes it, so
 * it is not wrapped in a transaction and records no event. The tenant is the
 * ambient scope, never a parameter (SHR-007).
 */
export class ListFiscalPeriods extends Query<ListFiscalPeriodsParams> {
  public constructor(params: ListFiscalPeriodsParams, options?: MessageOptions) {
    super('ListFiscalPeriods', params, options);
  }
}
