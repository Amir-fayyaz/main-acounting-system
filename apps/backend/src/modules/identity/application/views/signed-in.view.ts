import type { AuthenticatedPrincipalView } from './principal.view.js';

/**
 * The result of a successful sign-in (IAM-005; ADR-010 section 11).
 *
 * `token` is the bearer credential the client uses from now on, and this is the
 * only time the system can produce it: the stored state holds a digest, so the
 * value here cannot be recovered later. `tokenType` and `expiresAt` tell the
 * client how to present it and when it must authenticate again, and the
 * principal is the established identity.
 *
 * Nothing else is returned — no credential record, no hash, no tenant, no
 * role — so the response cannot be mistaken for an authorization decision or
 * disclose what the authentication store holds.
 */
export interface SignedInView {
  /** The bearer token to present on later requests; returned exactly once. */
  readonly token: string;
  /** How the token is presented, always `Bearer` for this mechanism. */
  readonly tokenType: 'Bearer';
  /** When the session stops being accepted, ISO-8601 in UTC. */
  readonly expiresAt: string;
  /** The established principal. */
  readonly principal: AuthenticatedPrincipalView;
}
