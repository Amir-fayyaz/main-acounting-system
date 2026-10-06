import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';
import type { RoleStatusValue } from '../../domain/value-objects/role-status.js';

/**
 * The input `ChangeRoleStatus` needs: the target role, the tenant it belongs to,
 * the requested lifecycle state and the revision the caller read.
 */
export interface ChangeRoleStatusPayload {
  readonly roleId: string;
  readonly tenantId: string;
  readonly status: RoleStatusValue;
  readonly expectedRevision: number;
}

/** The intent to move a Role along its lifecycle (IAM-004; SHR-003). */
export class ChangeRoleStatus extends Command<ChangeRoleStatusPayload> {
  public constructor(payload: ChangeRoleStatusPayload, options?: MessageOptions) {
    super('ChangeRoleStatus', payload, options);
  }
}
