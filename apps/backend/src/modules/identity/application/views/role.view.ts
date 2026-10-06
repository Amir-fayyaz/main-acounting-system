import type { RoleStatusValue } from '../../domain/value-objects/role-status.js';

/**
 * The application-level representation of a Role (IAM-004).
 *
 * This is a *view*, not the aggregate: plain, serializable values that a use
 * case can return and a presentation layer can map to a DTO. Handing out the
 * aggregate instead would let a caller mutate role state outside the
 * repository's optimistic-concurrency write, which is exactly what the
 * architecture forbids (ADR-003 section 16).
 *
 * `permissions` is the role's capability set in deterministic (sorted) order, so
 * a client can diff or cache it safely. `revision` is the token a client sends
 * back on the next change, so optimistic concurrency is usable across the HTTP
 * boundary (SHR-008).
 */
export interface RoleView {
  /** The stable role identity. */
  readonly id: string;
  /** The stable identity of the tenant that owns the role. */
  readonly tenantId: string;
  /** The current name. */
  readonly name: string;
  /** The lifecycle state, as its lower-case string value. */
  readonly status: RoleStatusValue;
  /** The granted capability keys, in deterministic (sorted) order. */
  readonly permissions: readonly string[];
  /** The revision to send as `expectedRevision` on the next change. */
  readonly revision: number;
  /** Creation instant, ISO-8601 in UTC. */
  readonly createdAt: string;
  /** Last-change instant, ISO-8601 in UTC. */
  readonly updatedAt: string;
}
