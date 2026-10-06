import { Query } from '../../../../shared/messaging/query.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/** The input `GetUser` needs: which user to read. */
export interface GetUserParams {
  readonly userId: string;
}

/**
 * The request to read one User by id (IAM-002; SHR-003).
 *
 * A User is tenant-independent, so this query carries no tenant criterion: the
 * identity of a person is not scoped to a tenant.
 */
export class GetUser extends Query<GetUserParams> {
  public constructor(params: GetUserParams, options?: MessageOptions) {
    super('GetUser', params, options);
  }
}
