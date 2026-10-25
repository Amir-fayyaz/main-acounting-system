import type { FiscalYearStatusValue } from '../../domain/value-objects/fiscal-year-status.js';

/**
 * The application-level representation of a fiscal year (FIS-002).
 *
 * This is a *view*, not the aggregate: plain, serializable values that a use
 * case can return and a presentation layer can map to a DTO. Handing out the
 * aggregate instead would let a caller mutate year state outside the
 * repository's optimistic-concurrency write, which is exactly what the
 * architecture forbids (ADR-003 section 16).
 *
 * `revision` is included on purpose: it is the token a client sends back on the
 * next update, so optimistic concurrency is usable across the HTTP boundary
 * without exposing storage vocabulary beyond a single integer (SHR-008).
 */
export interface FiscalYearView {
  /** The stable fiscal year identity. */
  readonly id: string;
  /** The owning tenant's stable identity. */
  readonly tenantId: string;
  /** The human label, unique per tenant. */
  readonly label: string;
  /** Inclusive first day, `YYYY-MM-DD`. */
  readonly startDate: string;
  /** Inclusive last day, `YYYY-MM-DD`. */
  readonly endDate: string;
  /** The lifecycle state, as its lower-case string value. */
  readonly status: FiscalYearStatusValue;
  /** The revision to send as `expectedRevision` on the next update. */
  readonly revision: number;
  /** Creation instant, ISO-8601 in UTC. */
  readonly createdAt: string;
  /** Last-change instant, ISO-8601 in UTC. */
  readonly updatedAt: string;
}
