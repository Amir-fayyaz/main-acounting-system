import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/**
 * The credentials a sign-in attempt presents: the primary contact email and the
 * secret (IAM-005).
 *
 * The payload is exactly what the user submitted and nothing else — no tenant,
 * no device, no role — because authentication establishes *who* the user is and
 * never *where* they may act.
 */
export interface SignInPayload {
  readonly email: string;
  readonly password: string;
}

/**
 * The intent to establish an authenticated identity (IAM-005; SHR-003).
 *
 * A credential is present in the payload, and that is unavoidable: verifying a
 * secret requires the secret. What matters is what happens around it — the raw
 * value is validated and converted to a `PlainPassword` at the use case
 * boundary, it is never stored, and the command is never logged, audited or
 * serialized into a response. The password policy is enforced before any
 * comparison runs, so a rejected attempt never reaches the hashing port.
 */
export class SignIn extends Command<SignInPayload> {
  public constructor(payload: SignInPayload, options?: MessageOptions) {
    super('SignIn', payload, options);
  }
}
