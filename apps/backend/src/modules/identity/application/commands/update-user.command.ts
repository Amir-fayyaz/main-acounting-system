import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/**
 * The input `UpdateUser` needs: the target identity, the profile attributes to
 * change and the revision the caller read.
 *
 * Only the mutable, identity-level attributes this stage supports are here:
 * display name and/or email. `expectedRevision` is part of the command, not an
 * option, so an update that does not state which state it believes is current
 * cannot be expressed (SHR-008).
 */
export interface UpdateUserPayload {
  readonly userId: string;
  readonly displayName?: string;
  readonly email?: string;
  readonly expectedRevision: number;
}

export class UpdateUser extends Command<UpdateUserPayload> {
  public constructor(payload: UpdateUserPayload, options?: MessageOptions) {
    super('UpdateUser', payload, options);
  }
}
