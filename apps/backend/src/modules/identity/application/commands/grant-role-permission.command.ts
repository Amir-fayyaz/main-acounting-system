import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/**
 * The input `GrantRolePermission` needs: the target role, the tenant it belongs
 * to, the capability key to add and the revision the caller read.
 */
export interface GrantRolePermissionPayload {
  readonly roleId: string;
  readonly tenantId: string;
  readonly permissionKey: string;
  readonly expectedRevision: number;
}

/** The intent to add a capability to a Role (IAM-004; SHR-003). */
export class GrantRolePermission extends Command<GrantRolePermissionPayload> {
  public constructor(payload: GrantRolePermissionPayload, options?: MessageOptions) {
    super('GrantRolePermission', payload, options);
  }
}
