import { describe, expect, it } from 'vitest';
import {
  formatIsoToJalaliFa,
  getJalaliYearBounds,
  getPeriodTitle,
  gregorianToJalali,
  isJalaliLeapYear,
  jalaliDaysInMonth,
  jalaliToGregorian,
} from '../utils/fiscal-calendar';

describe('fiscal-calendar', () => {
  it('identifies Jalali leap years correctly', () => {
    expect(isJalaliLeapYear(1403)).toBe(true);
    expect(isJalaliLeapYear(1404)).toBe(false);
    expect(isJalaliLeapYear(1405)).toBe(false);
    expect(isJalaliLeapYear(1399)).toBe(true);
  });

  it('calculates days in Jalali months', () => {
    expect(jalaliDaysInMonth(1405, 1)).toBe(31);
    expect(jalaliDaysInMonth(1405, 6)).toBe(31);
    expect(jalaliDaysInMonth(1405, 7)).toBe(30);
    expect(jalaliDaysInMonth(1405, 11)).toBe(30);
    expect(jalaliDaysInMonth(1405, 12)).toBe(29);
    expect(jalaliDaysInMonth(1403, 12)).toBe(30); // leap year
  });

  it('converts Jalali dates to Gregorian dates with exact match to backend', () => {
    // 1405 (standard year)
    const start1405 = jalaliToGregorian(1405, 1, 1);
    expect(start1405.iso).toBe('2026-03-21');

    const end1405 = jalaliToGregorian(1405, 12, 29);
    expect(end1405.iso).toBe('2027-03-20');

    // 1403 (leap year)
    const start1403 = jalaliToGregorian(1403, 1, 1);
    expect(start1403.iso).toBe('2024-03-20');

    const end1403 = jalaliToGregorian(1403, 12, 30);
    expect(end1403.iso).toBe('2025-03-20');
  });

  it('converts Gregorian ISO dates back to Jalali', () => {
    expect(gregorianToJalali('2026-03-21')).toEqual({ jYear: 1405, jMonth: 1, jDay: 1 });
    expect(gregorianToJalali('2027-03-20')).toEqual({ jYear: 1405, jMonth: 12, jDay: 29 });
    expect(gregorianToJalali('2024-03-20')).toEqual({ jYear: 1403, jMonth: 1, jDay: 1 });
  });

  it('computes year bounds spanning exactly one Jalali year', () => {
    const bounds1405 = getJalaliYearBounds(1405);
    expect(bounds1405.startDate).toBe('2026-03-21');
    expect(bounds1405.endDate).toBe('2027-03-20');

    const bounds1404 = getJalaliYearBounds(1404);
    expect(bounds1404.startDate).toBe('2025-03-21');
    expect(bounds1404.endDate).toBe('2026-03-20');
  });

  it('formats ISO date to Persian formatted Jalali string', () => {
    expect(formatIsoToJalaliFa('2026-03-21')).toBe('۱۴۰۵/۰۱/۰۱');
    expect(formatIsoToJalaliFa('2027-03-20')).toBe('۱۴۰۵/۱۲/۲۹');
  });

  it('generates Persian period title', () => {
    expect(getPeriodTitle(1405, 1)).toBe('فروردین ۱۴۰۵');
    expect(getPeriodTitle(1405, 12)).toBe('اسفند ۱۴۰۵');
  });
});
