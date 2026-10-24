import type { BusinessDate } from '../../../../shared/time/business-date.js';
import { FiscalYearInvalidRangeError } from '../errors/fiscal-year.errors.js';

/**
 * The date range a fiscal year covers (FIS-002; design section 4.3–4.4).
 *
 * The range *is* the rule's subject — two fiscal years of one tenant must
 * never share a day — so it is a type in its own right rather than two loose
 * dates: no code path can hold a half-built range, and nobody can forget to
 * compare both ends.
 *
 * Both ends are **inclusive**: a year runs from its first day through its last
 * day, so `2024-01-01 → 2024-12-31` covers every day of 2024. Adjacency is
 * therefore exact — a year ending `2024-12-31` and the next beginning
 * `2025-01-01` share no day — which is what lets ordinary calendar years sit
 * next to each other without overlapping.
 *
 * The dates are the shared kernel's {@link BusinessDate}: civil days with no
 * time and no timezone. The kernel is deliberately fiscal-agnostic; the fiscal
 * meaning is added here, in this module.
 */
export class FiscalYearRange {
  /**
   * Builds a range from its two inclusive ends.
   *
   * @throws FiscalYearInvalidRangeError — the start is not strictly before the
   * end. The shortest legal year covers two calendar days, which is what makes
   * "a year can hold at least one period" true by construction; a reversed or
   * zero-length range (`start >= end`) has no day at all and is refused.
   */
  public static of(startDate: BusinessDate, endDate: BusinessDate): FiscalYearRange {
    if (!startDate.isBefore(endDate)) {
      throw new FiscalYearInvalidRangeError(startDate.toIsoString(), endDate.toIsoString());
    }
    return new FiscalYearRange(startDate, endDate);
  }

  /** The inclusive first day. */
  public readonly startDate: BusinessDate;

  /** The inclusive last day. */
  public readonly endDate: BusinessDate;

  private constructor(startDate: BusinessDate, endDate: BusinessDate) {
    this.startDate = startDate;
    this.endDate = endDate;
  }

  /** Value equality: the same first and last day. */
  public equals(other: unknown): boolean {
    return (
      other instanceof FiscalYearRange &&
      this.startDate.equals(other.startDate) &&
      this.endDate.equals(other.endDate)
    );
  }

  public toString(): string {
    return `${this.startDate.toIsoString()}→${this.endDate.toIsoString()}`;
  }

  /** Serializes as both ends, the calendar-date wire format of FND-006. */
  public toJSON(): { startDate: string; endDate: string } {
    return {
      startDate: this.startDate.toIsoString(),
      endDate: this.endDate.toIsoString(),
    };
  }
}
