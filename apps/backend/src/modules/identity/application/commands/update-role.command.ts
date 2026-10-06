import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/**
 * The input `UpdateRole` needs: the target role, the tenant it belongs to, the
 * new name and the revision the caller read.
 */
export interface UpdateRolePayload {
  readonly roleId: string;
  readonly tenantId: string;
  readonly name: string;
  readonly expectedRevision: number;
}

/** The intent to rename a Role (IAM-004; SHR-003). */
export class UpdateRole extends Command<UpdateRolePayload> {
  public constructor(payload: UpdateRolePayload, options?: MessageOptions) {
    super('UpdateRole', payload, options);
  }
}
