/**
 * The result of an explicit invalidation (IAM-005).
 *
 * It states which session was invalidated and when, so a client can confirm the
 * effect and an operator can correlate it with the audit record. It carries no
 * credential and no user profile: invalidation is about a state ending, not
 * about who held it.
 */
export interface SignOutView {
  /** The session identity that was invalidated. */
  readonly sessionId: string;
  /** When the invalidation was recorded, ISO-8601 in UTC. */
  readonly revokedAt: string;
}
