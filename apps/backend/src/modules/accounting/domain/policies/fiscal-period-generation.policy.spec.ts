import { describe, expect, it } from 'vitest';

import { FiscalPeriodGenerationPolicy } from './fiscal-period-generation.policy.js';
import { FiscalPeriodStructureError } from '../errors/fiscal-period.errors.js';
import { FiscalYearRange } from '../value-objects/fiscal-year-range.js';
import { jalaliYearBounds, isJalaliLeapYear } from '../../../../shared/time/jalali-calendar.js';
import { BusinessDate } from '../../../../shared/time/business-date.js';

/**
 * The generation rule over the shared Jalali calendar (FIS-004). The calendar
 * itself — conversions, leap years, month bounds — is proven in the kernel's
 * own spec; what is under test here is the fiscal decision derived on top of it:
 * twelve contiguous months, the leap-year Esfand, and the refusal of a year
 * that does not span exactly one Jalali year.
 */

function aYear(start: string, end: string): FiscalYearRange {
  return FiscalYearRange.of(BusinessDate.parse(start), BusinessDate.parse(end));
}

describe('FiscalPeriodGenerationPolicy', () => {
  describe('a normal Jalali year — 1405 (Esfand has 29 days)', () => {
    const plan = FiscalPeriodGenerationPolicy.plan(
      aYear('2026-03-21', '2027-03-20'),
    ).valueOrThrow();

    it('produces exactly twelve periods, sequences 1..12', () => {
      expect(plan.jalaliYear).toBe(1405);
      expect(plan.periods).toHaveLength(12);
      expect(plan.periods.map((p) => p.sequence)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it('starts on 1 Farvardin and ends on the last Esfand of the year', () => {
      expect(plan.periods[0]?.startDate).toBe('2026-03-21');
      expect(plan.periods[11]?.endDate).toBe('2027-03-20');
    });

    it('chains every month to the next with no gap and no overlap', () => {
      const periods = plan.periods;

      for (let i = 0; i < periods.length - 1; i++) {
        const current = periods[i];
        const next = periods[i + 1];
        if (current === undefined || next === undefined) {
          throw new Error('the plan must contain twelve periods');
        }
        // The inclusive ranges share no day, and no day is missed between them.
        expect(BusinessDate.parse(current.endDate).addDays(1).toIsoString()).toBe(
          next.startDate,
        );
      }
    });

    it('covers the year exactly — the union of the twelve ranges is the year', () => {
      const yearBounds = jalaliYearBounds(plan.jalaliYear);
      expect(plan.periods[0]?.startDate).toBe(yearBounds.start.toIsoString());
      expect(
        fiscalDaysBetween(plan.periods[0]?.startDate ?? '', plan.periods[11]?.endDate ?? ''),
      ).toBe(daysBetween(yearBounds.start, yearBounds.end));
    });
  });

  describe('a leap Jalali year — Esfand has 30 days', () => {
    it('gives Esfand the leap day, so the year still closes exactly', () => {
      // 1403 is a leap year: 2024-03-20 to 2025-03-20 inclusive, 366 days.
      expect(isJalaliLeapYear(1403)).toBe(true);

      const plan = FiscalPeriodGenerationPolicy.plan(
        aYear('2024-03-20', '2025-03-20'),
      ).valueOrThrow();

      expect(plan.jalaliYear).toBe(1403);
      expect(plan.periods).toHaveLength(12);
      const esfand = plan.periods[11];
      expect(esfand?.startDate).toBe('2025-02-19');
      expect(esfand?.endDate).toBe('2025-03-20');
      expect(plan.periods[10]?.endDate).toBe('2025-02-18');
    });
  });

  describe('a fiscal year that does not span exactly one Jalali year', () => {
    it('is refused with FISCAL_PERIOD_STRUCTURE, with no plan to store', () => {
      // A Gregorian calendar year: it starts mid-Jalali-year 1402.
      const outcome = FiscalPeriodGenerationPolicy.plan(aYear('2024-01-01', '2024-12-31'));

      expect(outcome.isFail()).toBe(true);
      const error = outcome.errorOrThrow();
      expect(error).toBeInstanceOf(FiscalPeriodStructureError);
      expect(error.code).toBe('FISCAL_PERIOD_STRUCTURE');
      expect(error.details[0]?.jalaliYear).toBe(1402);
    });

    it('refuses a range that starts exactly on Farvardin 1st but ends early', () => {
      const outcome = FiscalPeriodGenerationPolicy.plan(aYear('2026-03-21', '2027-03-19'));

      expect(outcome.errorOrThrow()?.code).toBe('FISCAL_PERIOD_STRUCTURE');
    });

    it('refuses a range that ends exactly on last Esfand but starts late', () => {
      const outcome = FiscalPeriodGenerationPolicy.plan(aYear('2026-03-22', '2027-03-20'));

      expect(outcome.errorOrThrow()?.code).toBe('FISCAL_PERIOD_STRUCTURE');
    });
  });

  /** Inclusive day count between two ISO civil days. */
  function fiscalDaysBetween(startIso: string, endIso: string): number {
    return daysBetween(BusinessDate.parse(startIso), BusinessDate.parse(endIso));
  }

  function daysBetween(start: BusinessDate, end: BusinessDate): number {
    return start.diffDays(end) + 1;
  }
});
