import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { FiscalYearOverlapError } from '../errors/fiscal-year.errors.js';
import type { FiscalYearRange } from '../value-objects/fiscal-year-range.js';
import type { TenantReference } from '../value-objects/tenant-reference.js';

/**
 * The overlap rule for fiscal years (FIS-002; design section 4.3).
 *
 * A fiscal year is a tenant-owned, non-overlapping date range. Two ranges
 * **overlap** when they belong to the same tenant and share at least one
 * calendar day:
 *
 * ```text
 * overlaps(a, b)  ⇔  a.tenant == b.tenant  AND  a.start <= b.end  AND  b.start <= a.end
 * ```
 *
 * The end date is inclusive, so "share a day" is exact:
 *
 * | Situation                        | Result                    |
 * | -------------------------------- | ------------------------- |
 * | Identical ranges                 | overlap                   |
 * | One range contained in the other | overlap                   |
 * | Partial overlap                  | overlap                   |
 * | Exactly one shared day           | overlap                   |
 * | Adjacent (`a.end + 1 == b.start`)| **allowed** — no shared day |
 * | Disjoint                         | **allowed**               |
 * | Different tenants, any dates     | **allowed**               |
 *
 * The tenant comparison is part of the rule rather than a property of the
 * query that feeds it: overlap is defined *per company*, so the rule stays
 * total wherever it is evaluated. A closed year blocks exactly like an open
 * one — the rule is about the range, not the lifecycle.
 *
 * This policy is the single source of truth for the rule; the aggregate
 * consults it on creation and the database re-states it in triggers (design
 * section 6.2), but neither re-implements it.
 */

/**
 * The two facts the rule needs about a fiscal year: whose it is and which days
 * it covers. The `FiscalYear` aggregate satisfies this structurally, so the
 * policy can be evaluated over real years in the use case and over plain test
 * data in a unit test with no I/O.
 */
export interface FiscalYearSpan {
  readonly tenantId: TenantReference;
  readonly range: FiscalYearRange;
}

export class FiscalYearOverlapPolicy {
  private constructor() {}

  /** Whether two spans share at least one day of the same tenant. */
  public static overlaps(candidate: FiscalYearSpan, existing: FiscalYearSpan): boolean {
    if (!candidate.tenantId.equals(existing.tenantId)) {
      return false;
    }
    // `a.start <= b.end` is `NOT a.start > b.end`, and symmetrically for the
    // other end: the two inclusive intervals intersect exactly when neither
    // starts after the other ends.
    const startsOnOrBeforeOtherEnds = !candidate.range.startDate.isAfter(existing.range.endDate);
    const otherStartsOnOrBeforeEnds = !existing.range.startDate.isAfter(candidate.range.endDate);
    return startsOnOrBeforeOtherEnds && otherStartsOnOrBeforeEnds;
  }

  /**
   * Evaluates a candidate against every existing span; the first conflicting
   * one decides.
   *
   * A decline is an expected business outcome, so it is a failed `Result`
   * carrying `FiscalYearOverlapError` — never a thrown exception — and the
   * caller decides what to do with it (SHR-002).
   */
  public static evaluate(
    candidate: FiscalYearSpan,
    existing: readonly FiscalYearSpan[],
  ): Result<void, DomainError> {
    for (const span of existing) {
      if (FiscalYearOverlapPolicy.overlaps(candidate, span)) {
        return Result.fail(new FiscalYearOverlapError());
      }
    }
    return Result.ok(undefined);
  }
}
