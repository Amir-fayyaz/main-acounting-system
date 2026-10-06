import { Query } from '../../../../shared/messaging/query.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/** The input `ListTenantMembers` needs: which tenant. */
export interface ListTenantMembersParams {
  readonly tenantId: string;
}

/**
 * The request to read the members of one Tenant (IAM-003; SHR-003).
 *
 * The tenant is part of the query and is checked against the resolved tenant
 * scope, so the read cannot bypass the tenant boundary and browse another
 * tenant's members.
 */
export class ListTenantMembers extends Query<ListTenantMembersParams> {
  public constructor(params: ListTenantMembersParams, options?: MessageOptions) {
    super('ListTenantMembers', params, options);
  }
}
