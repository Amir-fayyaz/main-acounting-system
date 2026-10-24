import type { FiscalPeriodStateValue } from '../../domain/value-objects/fiscal-period-state.js';

/**
 * The application-level view of a fiscal period (FIS-004).
 *
 * This is a *view*, not the aggregate: plain, serializable values that a use
 * case can return and a presentation layer can map to a DTO. Handing out the
 * aggregate instead would let a caller mutate period state outside the
 * repository's optimistic-concurrency write, which is exactly what the
 * architecture forbids (ADR-003 section 16).
 */
export interface FiscalPeriodView {
  /** The stable fiscal period identity. */
  readonly id: string;
  /** The owning tenant's stable identity. */
  readonly tenantId: string;
  /** The fiscal year the period is a slice of. */
  readonly fiscalYearId: string;
  /** The Jalali calendar year the period belongs to. */
  readonly jalaliYear: number;
  /** The month position inside the year, 1 (Farvardin) through 12 (Esfand). */
  readonly sequence: number;
  /** Inclusive first day, `YYYY-MM-DD`. */
  readonly startDate: string;
  /** Inclusive last day, `YYYY-MM-DD`. */
  readonly endDate: string;
  /** The lifecycle state, as its lower-case string value. */
  readonly state: FiscalPeriodStateValue;
  /** Creation instant, ISO-8601 in UTC. */
  readonly createdAt: string;
  /** Last-change instant, ISO-8601 in UTC. */
  readonly updatedAt: string;
}

/** The twelve periods of one fiscal year, in calendar order. */
export interface FiscalPeriodListView {
  readonly fiscalYearId: string;
  readonly jalaliYear: number;
  readonly periods: readonly FiscalPeriodView[];
}
