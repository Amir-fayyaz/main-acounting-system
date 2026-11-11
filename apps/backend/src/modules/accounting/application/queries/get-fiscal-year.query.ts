import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';
import { Query } from '../../../../shared/messaging/query.js';

/** The input `GetFiscalYear` needs. */
export interface GetFiscalYearParams {
  /** The fiscal year to read; must belong to the current tenant scope. */
  readonly fiscalYearId: string;
}

/**
 * The request to read one fiscal year (FIS-002; SHR-003).
 *
 * A query is side-effect free: it reads current state and never changes it, so
 * it is not wrapped in a transaction and records no event. The tenant is
 * deliberately not a parameter — the read runs for the tenant the trusted
 * boundary resolved into the ambient scope (SHR-007).
 */
export class GetFiscalYear extends Query<GetFiscalYearParams> {
  public constructor(params: GetFiscalYearParams, options?: MessageOptions) {
    super('GetFiscalYear', params, options);
  }
}
