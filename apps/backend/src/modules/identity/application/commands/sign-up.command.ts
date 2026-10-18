import { Command } from '../../../../shared/messaging/command.js';
import type { MessageOptions } from '../../../../shared/messaging/message-metadata.js';

/**
 * The input `SignUp` needs: the display name, the primary contact email and the
 * secret the user will sign in with (IAM-008).
 */
export interface SignUpPayload {
  readonly displayName: string;
  readonly email: string;
  readonly password: string;
}

/**
 * The intent to register a new user through a public, self-service flow
 * (IAM-008; SHR-003).
 *
 * Like `SignIn`, the payload carries the raw secret in the same shape the user
 * submitted, because turn-key registration is one *unit of work*: a `User` and
 * the credential that lets the user sign in must be established together or not
 * at all. What the command itself never does is establish the credential's
 * meaning — the payload is validated into identity values by the user input
 * parsers and into a `PlainPassword` by the authentication input parser, the
 * secret is hashed through the approved password-hashing port inside the
 * authentication boundary, and it is never stored, logged or serialized.
 *
 * The command states *what should happen*, never a result and never a
 * transport, and it carries only what sign-up needs: no tenant, no membership,
 * no role and no permission — a successful sign-up publishes a user identity
 * and grants nothing else (ADR-010 section 2).
 */
export class SignUp extends Command<SignUpPayload> {
  public constructor(payload: SignUpPayload, options?: MessageOptions) {
    super('SignUp', payload, options);
  }
}
