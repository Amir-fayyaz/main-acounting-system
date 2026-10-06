import { Query } from '../../../../shared/messaging/query.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/** The input `ListMembershipRoles` needs: which membership, in which tenant. */
export interface ListMembershipRolesParams {
  readonly tenantId: string;
  readonly membershipId: string;
}

/**
 * The request to read the roles held by one Membership (IAM-004; SHR-003).
 *
 * The tenant is checked against the resolved tenant scope, and the membership
 * must belong to that tenant, so the read cannot bypass the tenant boundary.
 */
export class ListMembershipRoles extends Query<ListMembershipRolesParams> {
  public constructor(params: ListMembershipRolesParams, options?: MessageOptions) {
    super('ListMembershipRoles', params, options);
  }
}
