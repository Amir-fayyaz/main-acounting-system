import { Query } from '../../../../shared/messaging/query.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/** The input `GetRole` needs: which role, in which tenant. */
export interface GetRoleParams {
  readonly roleId: string;
  readonly tenantId: string;
}

/**
 * The request to read one Role (IAM-004; SHR-003).
 *
 * A role is tenant-owned data, so the read is tenant-scoped: the tenant is part
 * of the query and is checked against the resolved tenant scope, so a caller
 * cannot read another tenant's role by supplying an id.
 */
export class GetRole extends Query<GetRoleParams> {
  public constructor(params: GetRoleParams, options?: MessageOptions) {
    super('GetRole', params, options);
  }
}
