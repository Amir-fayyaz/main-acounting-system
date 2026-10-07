import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/**
 * The authentication state to invalidate (IAM-005).
 *
 * The session is named by its identity, which the authentication boundary
 * resolved from the presented token *before* this command was built — so the
 * token never travels past the boundary it was read at, and the use case acts on
 * a session the caller has already been proven to hold.
 */
export interface SignOutPayload {
  readonly sessionId: string;
}

/**
 * The intent to invalidate the current authentication state (IAM-005; SHR-003).
 *
 * Sign-out is a state change, not a deletion: the session record stays and gains
 * an invalidation instant, so the audit trail can still name the session that
 * ended and nothing has to be reconstructed from a missing row.
 */
export class SignOut extends Command<SignOutPayload> {
  public constructor(payload: SignOutPayload, options?: MessageOptions) {
    super('SignOut', payload, options);
  }
}
