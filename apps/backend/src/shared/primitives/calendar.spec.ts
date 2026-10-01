import { describe, expect, it } from 'vitest';

import {
  assertCivilDate,
  assertInstantParts,
  daysInMonth,
  epochDays,
  fromUtcMillis,
  isLeapYear,
  MILLIS_PER_DAY,
  toUtcMillis,
} from './calendar.js';
import { InvalidPrimitiveError } from './invalid-primitive-error.js';

const instant = (parts: {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
  millisecond?: number;
}) => ({
  hour: 0,
  minute: 0,
  second: 0,
  millisecond: 0,
  ...parts,
});

describe('calendar rules', () => {
  it('knows leap years, including the century rule', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2023)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
  });

  it('knows the length of every month', () => {
    expect(daysInMonth(2024, 1)).toBe(31);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2023, 2)).toBe(28);
    expect(daysInMonth(2024, 4)).toBe(30);
    expect(daysInMonth(2024, 12)).toBe(31);
  });
});

describe('assertCivilDate', () => {
  it('accepts a real date', () => {
    expect(() => assertCivilDate(2026, 10, 2, 'BusinessDate', 'date')).not.toThrow();
    expect(() => assertCivilDate(2024, 2, 29, 'BusinessDate', 'date')).not.toThrow();
    expect(() => assertCivilDate(1, 1, 1, 'BusinessDate', 'date')).not.toThrow();
    expect(() => assertCivilDate(9999, 12, 31, 'BusinessDate', 'date')).not.toThrow();
  });

  it.each([
    ['a month of zero', 2026, 0, 1],
    ['a month of thirteen', 2026, 13, 1],
    ['a day of zero', 2026, 1, 0],
    ['a day past the end of the month', 2026, 4, 31],
    ['30 February', 2023, 2, 30],
    ['29 February in a common year', 2023, 2, 29],
    ['a year of zero', 0, 1, 1],
  ])('rejects %s', (_label, year, month, day) => {
    expect(() => assertCivilDate(year, month, day, 'BusinessDate', 'date')).toThrow(
      InvalidPrimitiveError,
    );
  });

  it('rejects a fractional part', () => {
    expect(() => assertCivilDate(2026.5, 1, 1, 'BusinessDate', 'date')).toThrow(
      'BusinessDate: date.year must be an integer',
    );
  });
});

describe('assertInstantParts', () => {
  it('accepts a valid instant', () => {
    expect(() =>
      assertInstantParts(instant({ year: 2026, month: 10, day: 2, hour: 23 }), 'DateTime', 'value'),
    ).not.toThrow();
  });

  it.each([
    ['an hour of 24', { hour: 24 }],
    ['a minute of 60', { minute: 60 }],
    ['a leap second', { second: 60 }],
    ['a millisecond of 1000', { millisecond: 1000 }],
    ['a negative hour', { hour: -1 }],
  ])('rejects %s', (_label, partial) => {
    expect(() =>
      assertInstantParts(
        instant({ year: 2026, month: 10, day: 2, ...partial }),
        'DateTime',
        'value',
      ),
    ).toThrow(InvalidPrimitiveError);
  });
});

describe('epoch conversion', () => {
  it('round-trips a UTC instant through its parts', () => {
    const parts = instant({
      year: 2026,
      month: 9,
      day: 30,
      hour: 9,
      minute: 22,
      second: 34,
      millisecond: 673,
    });
    expect(fromUtcMillis(toUtcMillis(parts))).toEqual(parts);
  });

  it('keeps years below 100 out of the 1900s', () => {
    const parts = instant({ year: 99, month: 5, day: 4 });
    const millis = toUtcMillis(parts);
    // `Date.UTC(99, ...)` would land in 1999; the helper must not.
    expect(millis).toBeLessThan(toUtcMillis(instant({ year: 1900, month: 1, day: 1 })));
    expect(fromUtcMillis(millis)).toEqual(parts);
  });

  it('is zero at the Unix epoch', () => {
    expect(toUtcMillis(instant({ year: 1970, month: 1, day: 1 }))).toBe(0);
    expect(fromUtcMillis(0)).toEqual(instant({ year: 1970, month: 1, day: 1 }));
  });

  it('counts whole days since the epoch in both directions', () => {
    expect(epochDays({ year: 1970, month: 1, day: 1 })).toBe(0);
    expect(epochDays({ year: 1970, month: 1, day: 2 })).toBe(1);
    expect(epochDays({ year: 1969, month: 12, day: 31 })).toBe(-1);
    expect(MILLIS_PER_DAY).toBe(86_400_000);
  });

  it('produces NaN parts for a non-finite timestamp so validation rejects it', () => {
    const parts = fromUtcMillis(Number.NaN);
    expect(Number.isNaN(parts.year)).toBe(true);
    expect(() =>
      assertCivilDate(parts.year, parts.month, parts.day, 'DateTime', 'timestamp'),
    ).toThrow(InvalidPrimitiveError);
  });
});
