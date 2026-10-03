import type { TenantStatusValue } from '../../domain/value-objects/tenant-status.js';

/**
 * The application-level representation of a tenant (IAM-001).
 *
 * This is a *view*, not the aggregate: plain, serializable values that a use
 * case can return and a presentation layer can map to a DTO. Handing out the
 * aggregate instead would let a caller mutate tenant state outside the
 * repository's optimistic-concurrency write, which is exactly what the
 * architecture forbids (ADR-003 section 16).
 *
 * `revision` is included on purpose: it is the token a client sends back on the
 * next update, so optimistic concurrency is usable across the HTTP boundary
 * without exposing storage vocabulary beyond a single integer (SHR-008).
 */
export interface TenantView {
  /** The stable tenant/tenant identity. */
  readonly id: string;
  /** The current name. */
  readonly name: string;
  /** The lifecycle state, as its lower-case string value. */
  readonly status: TenantStatusValue;
  /** The revision to send as `expectedRevision` on the next update. */
  readonly revision: number;
  /** Creation instant, ISO-8601 in UTC. */
  readonly createdAt: string;
  /** Last-change instant, ISO-8601 in UTC. */
  readonly updatedAt: string;
}
