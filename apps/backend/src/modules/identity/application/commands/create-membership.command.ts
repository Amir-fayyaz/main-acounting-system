import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/**
 * The input `CreateMembership` needs: the user to link and the tenant to link
 * them to.
 *
 * The tenant is part of the payload because it is the boundary the operation
 * runs under (the use case checks it against the resolved tenant scope); the
 * user is the only identity the caller is choosing here.
 */
export interface CreateMembershipPayload {
  readonly userId: string;
  readonly tenantId: string;
}

/**
 * The intent to link a User to a Tenant (IAM-003; SHR-003).
 *
 * A command states *what should happen* and carries the input, never a result
 * and never a transport. It carries no role, permission or invitation — those
 * are out of scope for this issue.
 */
export class CreateMembership extends Command<CreateMembershipPayload> {
  public constructor(payload: CreateMembershipPayload, options?: MessageOptions) {
    super('CreateMembership', payload, options);
  }
}
