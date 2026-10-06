import { Query } from '../../../../shared/messaging/query.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/** The input `ListUserMemberships` needs: which user. */
export interface ListUserMembershipsParams {
  readonly userId: string;
}

/**
 * The request to read the memberships of one User (IAM-003; SHR-003).
 *
 * A User is tenant-independent, so this query carries no tenant criterion: the
 * memberships a person holds span every tenant they belong to, and the answer is
 * the list of those relationships — not a claim about any one tenant.
 */
export class ListUserMemberships extends Query<ListUserMembershipsParams> {
  public constructor(params: ListUserMembershipsParams, options?: MessageOptions) {
    super('ListUserMemberships', params, options);
  }
}
