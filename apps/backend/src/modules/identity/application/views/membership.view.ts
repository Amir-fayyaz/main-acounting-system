import type { MembershipStatusValue } from '../../domain/value-objects/membership-status.js';

/**
 * The application-level representation of a Membership (IAM-003).
 *
 * This is a *view*, not the aggregate: plain, serializable values that a use
 * case can return and a presentation layer can map to a DTO. Handing out the
 * aggregate instead would let a caller mutate membership state outside the
 * repository's optimistic-concurrency write, which is exactly what the
 * architecture forbids (ADR-003 section 16).
 *
 * `revision` is included on purpose: it is the token a client sends back on the
 * next lifecycle change, so optimistic concurrency is usable across the HTTP
 * boundary without exposing storage vocabulary beyond a single integer (SHR-008).
 *
 * The view carries the identities the relationship refers to — the user and the
 * tenant — and no business data copied from either of them.
 */
export interface MembershipView {
  /** The stable membership identity. */
  readonly id: string;
  /** The identity of the user the membership belongs to. */
  readonly userId: string;
  /** The stable identity of the tenant the membership grants access to. */
  readonly tenantId: string;
  /** The lifecycle state, as its lower-case string value. */
  readonly status: MembershipStatusValue;
  /** The revision to send as `expectedRevision` on the next change. */
  readonly revision: number;
  /** Creation instant, ISO-8601 in UTC. */
  readonly createdAt: string;
  /** Last-change instant, ISO-8601 in UTC. */
  readonly updatedAt: string;
}
