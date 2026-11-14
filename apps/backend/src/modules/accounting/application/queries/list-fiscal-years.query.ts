import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';
import { Query } from '../../../../shared/messaging/query.js';

/**
 * The request to list one tenant's fiscal years (FIS-002; SHR-003).
 *
 * A query is side-effect free and takes no tenant: the rows it may return are
 * exactly the rows of the ambient tenant scope (SHR-007; IAM-007). Pagination
 * is a transport concern and is applied by the presentation layer over the
 * returned views.
 */
export class ListFiscalYears extends Query<Record<string, never>> {
  public constructor(options?: MessageOptions) {
    super('ListFiscalYears', {}, options);
  }
}
