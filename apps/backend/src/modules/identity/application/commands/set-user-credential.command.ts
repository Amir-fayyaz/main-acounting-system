import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/**
 * The credential to establish for an existing user (IAM-005).
 *
 * Like `SignIn`, the payload carries the raw secret because hashing it is the
 * whole operation. It carries a user identity rather than an email so
 * provisioning cannot create a user as a side effect: authentication resolves to
 * an existing identity, and this command never invents one.
 */
export interface SetUserCredentialPayload {
  readonly userId: string;
  readonly password: string;
}

/**
 * The intent to establish (or replace) a user's credential (IAM-005; SHR-003).
 *
 * This is the provisioning half of the authentication contract: a user is
 * created as an identity (IAM-002) and a credential is then established for it,
 * which is what lets a valid user sign in. Replacing an existing credential is
 * the same operation — a rotation — and it invalidates the sessions the previous
 * secret had established, so a changed secret cannot leave a usable session
 * behind it.
 *
 * **Access control for this operation is deliberately not part of this issue.**
 * Authorization is out of scope for IAM-005, exactly as it is for the other
 * identity resources today; when authorization is enforced, this command belongs
 * to a privileged caller, and this note is the reminder that the resource is
 * currently unguarded by design rather than by accident.
 */
export class SetUserCredential extends Command<SetUserCredentialPayload> {
  public constructor(payload: SetUserCredentialPayload, options?: MessageOptions) {
    super('SetUserCredential', payload, options);
  }
}
