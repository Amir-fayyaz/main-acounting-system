import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/**
 * The input `RevokeRolePermission` needs: the target role, the tenant it belongs
 * to, the capability key to remove and the revision the caller read.
 */
export interface RevokeRolePermissionPayload {
  readonly roleId: string;
  readonly tenantId: string;
  readonly permissionKey: string;
  readonly expectedRevision: number;
}

/** The intent to remove a capability from a Role (IAM-004; SHR-003). */
export class RevokeRolePermission extends Command<RevokeRolePermissionPayload> {
  public constructor(payload: RevokeRolePermissionPayload, options?: MessageOptions) {
    super('RevokeRolePermission', payload, options);
  }
}
