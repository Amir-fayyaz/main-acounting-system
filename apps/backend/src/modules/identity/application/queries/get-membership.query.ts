import { Query } from '../../../../shared/messaging/query.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/** The input `GetMembership` needs: which membership, in which tenant. */
export interface GetMembershipParams {
  readonly membershipId: string;
  readonly tenantId: string;
}

/**
 * The request to read one Membership (IAM-003; SHR-003).
 *
 * A membership is tenant-owned data, so the read is tenant-scoped: the tenant is
 * part of the query and is checked against the resolved tenant scope, so a
 * caller cannot read another tenant's membership by supplying an id.
 */
export class GetMembership extends Query<GetMembershipParams> {
  public constructor(params: GetMembershipParams, options?: MessageOptions) {
    super('GetMembership', params, options);
  }
}
