import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { FiscalPeriodStructureError } from '../errors/fiscal-period.errors.js';
import type { FiscalPeriodStructureErrorDetail } from '../errors/fiscal-period.errors.js';
import type { FiscalYearRange } from '../value-objects/fiscal-year-range.js';
import {
  businessDateToJalali,
  jalaliMonthBounds,
  jalaliYearBounds,
} from '../../../../shared/time/jalali-calendar.js';

/**
 * The period generation rule (FIS-004).
 *
 * A fiscal year is lived in month by month, so creating a year must produce
 * its periods. This policy is the single source of the rule:
 *
 * ```text
 * plan(year) =
 *   the Jalali year the year's first day falls in,
 *   × the twelve monthly bounds of that year,
 *   × verified contiguous: Farvardin 1st = the year's first day,
 *     the last Esfand = the year's last day, and no day counted twice or missed
 * ```
 *
 * The calendar arithmetic is never re-implemented here — the shared kernel's
 * `jalaliMonthBounds` / `jalaliYearBounds` (FIS-003) are the source of every
 * boundary, including the leap-year Esfand. What the policy adds is the
 * fiscal decision that a year spans **exactly one Jalali year**, and the
 * invariants derived from it:
 *
 * - **Count.** Always exactly twelve periods, sequences 1..12.
 * - **No gap, no overlap.** `period[i]`'s last day + 1 = `period[i+1]`'s first
 *   day, computed and asserted rather than assumed from the calendar, so the
 *   union of the twelve closed ranges is exactly the year's closed range.
 * - **Fails before anything exists.** A year whose range is not exactly one
 *   Jalali year is refused with `FISCAL_PERIOD_STRUCTURE` — generation is a
 *   declined plan, never a partially written one.
 */

/** One planned period: its month position and its inclusive day range. */
export interface PlannedFiscalPeriod {
  readonly sequence: number;
  readonly startDate: string;
  readonly endDate: string;
}

/** The complete plan a generation call builds: twelve periods of one Jalali year. */
export interface FiscalPeriodPlan {
  /** The Jalali year the fiscal year's first day falls in. */
  readonly jalaliYear: number;
  /** The twelve months in calendar order, contiguous and gap-free. */
  readonly periods: readonly PlannedFiscalPeriod[];
}

export class FiscalPeriodGenerationPolicy {
  private constructor() {}

  /**
   * Plans the twelve monthly periods of a fiscal year.
   *
   * The year's first day decides the Jalali year; the plan is accepted only
   * when the year's last day is that same Jalali year's last Esfand and the
   * twelve bounds chain without a gap or a shared day.
   *
   * @returns a failed `Result` with `FISCAL_PERIOD_STRUCTURE` when the fiscal
   * year does not span exactly one Jalali year, or when the derived bounds
   * would not cover it exactly.
   */
  public static plan(yearRange: FiscalYearRange): Result<FiscalPeriodPlan, DomainError> {
    const jalaliYear = businessDateToJalali(yearRange.startDate).jYear;
    const yearBounds = jalaliYearBounds(jalaliYear);

    // A fiscal year must span exactly one Jalali year for its twelve monthly
    // periods to cover it with no gap and no overlap.
    const deviation = jalaliYearDeviation(
      jalaliYear,
      yearBounds.start.toIsoString(),
      yearBounds.end.toIsoString(),
      yearRange,
    );
    if (deviation !== undefined) {
      const details: FiscalPeriodStructureErrorDetail[] = [
        { code: 'FISCAL_PERIOD_STRUCTURE', message: deviation, jalaliYear },
      ];
      return Result.fail(
        new FiscalPeriodStructureError(
          'The fiscal year does not span exactly one Jalali year; its monthly periods cannot cover it.',
          details,
        ),
      );
    }

    const details: FiscalPeriodStructureErrorDetail[] = [];

    const planned: PlannedFiscalPeriod[] = [];
    let previousEnd: string | undefined;

    for (let sequence = 1; sequence <= 12; sequence++) {
      const bounds = jalaliMonthBounds(jalaliYear, sequence);
      const startDate = bounds.start.toIsoString();
      const endDate = bounds.end.toIsoString();

      // Contiguity, asserted rather than assumed: no day missed and no day
      // counted twice, whatever the calendar arithmetic turns out to be.
      if (sequence > 1 && previousEnd !== undefined) {
        const expectedStart = bounds.start.subtractDays(1).toIsoString();
        if (previousEnd !== expectedStart) {
          details.push({
            code: 'FISCAL_PERIOD_STRUCTURE',
            message: `period ${sequence - 1} ends ${previousEnd} but period ${sequence} starts ${startDate}; the months are not contiguous`,
            jalaliYear,
          });
          break;
        }
      }

      planned.push({ sequence, startDate, endDate });
      previousEnd = endDate;
    }

    if (details.length > 0) {
      return Result.fail(
        new FiscalPeriodStructureError(
          'The monthly periods of this fiscal year are not contiguous.',
          details,
        ),
      );
    }

    return Result.ok({ jalaliYear, periods: planned });
  }
}

/**
 * Whether the fiscal year's range deviates from the Jalali year it starts in,
 * as a human-readable reason or `undefined` when it does not.
 */
function jalaliYearDeviation(
  jalaliYear: number,
  jalaliStart: string,
  jalaliEnd: string,
  yearRange: FiscalYearRange,
): string | undefined {
  const start = yearRange.startDate.toIsoString();
  const end = yearRange.endDate.toIsoString();
  if (start !== jalaliStart) {
    return `the fiscal year starts ${start}, not the 1 Farvardin (${jalaliStart}) of Jalali year ${jalaliYear}`;
  }
  if (end !== jalaliEnd) {
    return `the fiscal year ends ${end}, not the last Esfand (${jalaliEnd}) of Jalali year ${jalaliYear}`;
  }
  return undefined;
}
