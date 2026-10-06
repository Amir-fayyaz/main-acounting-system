import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/** The input `CreateRole` needs: the tenant to create it in and its name. */
export interface CreateRolePayload {
  readonly tenantId: string;
  readonly name: string;
}

/**
 * The intent to create a Role within a Tenant (IAM-004; SHR-003).
 *
 * A command states *what should happen* and carries the input, never a result
 * and never a transport. The role starts with no permissions; granting them is a
 * separate decision.
 */
export class CreateRole extends Command<CreateRolePayload> {
  public constructor(payload: CreateRolePayload, options?: MessageOptions) {
    super('CreateRole', payload, options);
  }
}
