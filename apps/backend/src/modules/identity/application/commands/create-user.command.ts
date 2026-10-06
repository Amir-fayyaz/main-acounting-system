import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/** The input `CreateUser` needs: the display name and primary contact email. */
export interface CreateUserPayload {
  readonly displayName: string;
  readonly email: string;
}

/**
 * The intent to create a User (IAM-002; SHR-003).
 *
 * A command states *what should happen* and carries the input, never a result
 * and never a transport. It carries only Identity-owned attributes: no tenant,
 * no role, no password and no membership — those are out of scope for this
 * issue, and a User is tenant-independent by design.
 */
export class CreateUser extends Command<CreateUserPayload> {
  public constructor(payload: CreateUserPayload, options?: MessageOptions) {
    super('CreateUser', payload, options);
  }
}
