import { Query } from '../../../../shared/messaging/query.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/** The input `GetEffectivePermissions` needs: which membership, in which tenant. */
export interface EffectivePermissionsParams {
  readonly tenantId: string;
  readonly membershipId: string;
}

/**
 * The request to resolve the effective permissions of one Membership (IAM-004;
 * SHR-003).
 *
 * The result is the union of the capabilities of the membership's *active* roles
 * (through *active* assignments). It is a resolution, not an enforcement:
 * checking whether a user may perform an action belongs to the authorization
 * issue (IAM-006), and this query only answers which capabilities the membership
 * currently holds.
 */
export class GetEffectivePermissions extends Query<EffectivePermissionsParams> {
  public constructor(params: EffectivePermissionsParams, options?: MessageOptions) {
    super('GetEffectivePermissions', params, options);
  }
}
