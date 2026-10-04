import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';
import { Query } from '../../../../shared/messaging/query.js';

/** The input `GetTenant` needs. */
export interface GetTenantParams {
  /** The tenant to read; must match the current tenant scope. */
  readonly tenantId: string;
}

/**
 * The request to read one tenant (IAM-001; SHR-003).
 *
 * A query is side-effect free: it reads current state and never changes it, so
 * it is not wrapped in a transaction and records no event.
 */
export class GetTenant extends Query<GetTenantParams> {
  public constructor(params: GetTenantParams, options?: MessageOptions) {
    super('GetTenant', params, options);
  }
}
