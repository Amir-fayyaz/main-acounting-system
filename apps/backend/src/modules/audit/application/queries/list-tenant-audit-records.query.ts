import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';
import { Query } from '../../../../shared/messaging/query.js';

/**
 * The input `ListTenantAuditRecords` needs (AUD-001; SHR-003).
 *
 * It carries the tenant the caller *claims* plus the filters the trail supports.
 * The claim is checked against the resolved tenant scope by the use case, so a
 * body or query field can never widen the read beyond the caller's own tenant
 * (SHR-007; ADR-003 section 24).
 */
export interface ListTenantAuditRecordsParams {
  readonly tenantId: string;
  readonly actorUserId?: string;
  readonly action?: string;
  readonly targetType?: string;
  readonly targetId?: string;
  readonly outcome?: string;
  /** Inclusive lower bound of the time window, ISO-8601 with a zone. */
  readonly from?: string;
  /** Inclusive upper bound of the time window, ISO-8601 with a zone. */
  readonly to?: string;
  /** 1-based page number, per the standard pagination convention. */
  readonly page: number;
  /** Page size, per the standard pagination convention. */
  readonly limit: number;
}

/**
 * The request to read one tenant's audit trail (AUD-001).
 *
 * A query in the strict sense: it changes nothing, raises nothing and opens no
 * transaction. Reading the trail is itself an audited-capable operation, but the
 * *record* of a refused read is produced by the authorization boundary that
 * refused it, not by this query — a use case never writes on the read path.
 */
export class ListTenantAuditRecords extends Query<ListTenantAuditRecordsParams> {
  public constructor(params: ListTenantAuditRecordsParams, options?: MessageOptions) {
    super('ListTenantAuditRecords', params, options);
  }
}
