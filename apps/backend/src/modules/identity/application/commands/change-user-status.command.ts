import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';
import type { UserStatusValue } from '../../domain/value-objects/user-status.js';

/**
 * The input `ChangeUserStatus` needs: the target identity, the requested
 * lifecycle state and the revision the caller read.
 *
 * Status is a first-class lifecycle concern, so it gets its own command rather
 * than being lumped into the profile-update command.
 */
export interface ChangeUserStatusPayload {
  readonly userId: string;
  readonly status: UserStatusValue;
  readonly expectedRevision: number;
}

export class ChangeUserStatus extends Command<ChangeUserStatusPayload> {
  public constructor(payload: ChangeUserStatusPayload, options?: MessageOptions) {
    super('ChangeUserStatus', payload, options);
  }
}
