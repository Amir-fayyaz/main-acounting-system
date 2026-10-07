import type { AuthenticatedPrincipalView } from './principal.view.js';

/**
 * A validated authentication state, as a protected request sees it (IAM-005).
 *
 * It pairs the {@link AuthenticatedPrincipalView} — who the request is — with
 * the session metadata a client needs to know when it must authenticate again
 * (`expiresAt`). The session's identity is included because an audit record and
 * a sign-out both name it, and because it is an opaque UUID that discloses
 * nothing about the user.
 *
 * The token is deliberately absent: this view is what a *later* request resolves
 * from a token, so carrying the token back would let a response body become a
 * credential store. It holds no credential, no digest and no tenant.
 */
export interface AuthenticatedSessionView {
  /** The session identity, used to invalidate exactly this session. */
  readonly sessionId: string;
  /** When this authentication state stops being accepted, ISO-8601 in UTC. */
  readonly expiresAt: string;
  /** The authenticated principal. */
  readonly principal: AuthenticatedPrincipalView;
}
