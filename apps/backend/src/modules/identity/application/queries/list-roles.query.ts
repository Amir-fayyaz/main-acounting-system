import { Query } from '../../../../shared/messaging/query.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/** The input `ListRoles` needs: which tenant. */
export interface ListRolesParams {
  readonly tenantId: string;
}

/**
 * The request to read the Roles of one Tenant (IAM-004; SHR-003).
 *
 * The tenant is checked against the resolved tenant scope, so the read cannot
 * bypass the tenant boundary.
 */
export class ListRoles extends Query<ListRolesParams> {
  public constructor(params: ListRolesParams, options?: MessageOptions) {
    super('ListRoles', params, options);
  }
}
