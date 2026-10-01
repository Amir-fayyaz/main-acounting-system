import { describe, expect, it } from 'vitest';

import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';
import { BusinessDate } from './business-date.js';

describe('BusinessDate.parse', () => {
  it('reads the YYYY-MM-DD wire format', () => {
    const date = BusinessDate.parse('2026-10-02');
    expect(date.year).toBe(2026);
    expect(date.month).toBe(10);
    expect(date.day).toBe(2);
    expect(date.toIsoString()).toBe('2026-10-02');
    expect(date.toString()).toBe('2026-10-02');
    expect(date.toJSON()).toBe('2026-10-02');
    expect(JSON.stringify(date)).toBe('"2026-10-02"');
  });

  it('zero-pads a single-digit month and day', () => {
    expect(BusinessDate.parse('2026-01-05').toIsoString()).toBe('2026-01-05');
    expect(BusinessDate.parse('2026-11-30').toIsoString()).toBe('2026-11-30');
  });

  it.each([
    ['a slash-separated date', '2026/10/02'],
    ['a date with a time', '2026-10-02T00:00:00Z'],
    ['a date without dashes', '20261002'],
    ['a two-digit year', '26-10-02'],
    ['a relative word', 'today'],
  ])('rejects %s', (_label, value) => {
    expect(() => BusinessDate.parse(value)).toThrow(InvalidPrimitiveError);
    expect(() => BusinessDate.parse(value)).toThrow('BusinessDate: value must be a calendar date');
  });

  it('rejects a blank value', () => {
    expect(() => BusinessDate.parse('')).toThrow('BusinessDate: value must not be blank');
  });

  it('rejects a non-string at runtime', () => {
    expect(() => BusinessDate.parse(null as unknown as string)).toThrow(
      'BusinessDate: value must be a string',
    );
  });
});

describe('BusinessDate.of', () => {
  it('accepts every real date, including leap days and the ISO range ends', () => {
    expect(() => BusinessDate.of(2024, 2, 29)).not.toThrow();
    expect(() => BusinessDate.of(2000, 2, 29)).not.toThrow();
    expect(() => BusinessDate.of(1, 1, 1)).not.toThrow();
    expect(() => BusinessDate.of(9999, 12, 31)).not.toThrow();
  });

  it.each([
    ['a month of thirteen', 2026, 13, 1],
    ['a day of zero', 2026, 1, 0],
    ['a day past the end of the month', 2026, 4, 31],
    ['29 February in a common year', 2023, 2, 29],
    ['a fractional year', 2026.5, 1, 1],
  ])('rejects %s', (_label, year, month, day) => {
    expect(() => BusinessDate.of(year, month, day)).toThrow(InvalidPrimitiveError);
  });

  it('names the offending field in the message', () => {
    expect(() => BusinessDate.parse('2023-02-30')).toThrow('BusinessDate: date');
    expect(() => BusinessDate.of(2026, 1, 40)).toThrow('day must be between 1 and 31');
  });
});

describe('date arithmetic', () => {
  it('moves by whole days across months, years and leap days', () => {
    expect(BusinessDate.parse('2024-02-28').addDays(1).toIsoString()).toBe('2024-02-29');
    expect(BusinessDate.parse('2023-02-28').addDays(1).toIsoString()).toBe('2023-03-01');
    expect(BusinessDate.parse('2026-12-31').addDays(1).toIsoString()).toBe('2027-01-01');
    expect(BusinessDate.parse('2026-10-02').addDays(-2).toIsoString()).toBe('2026-09-30');
    expect(BusinessDate.parse('2026-10-02').subtractDays(2).toIsoString()).toBe('2026-09-30');
    expect(BusinessDate.parse('2026-10-02').addDays(0).toIsoString()).toBe('2026-10-02');
  });

  it('rejects a non-integer or absurd number of days', () => {
    expect(() => BusinessDate.parse('2026-10-02').addDays(1.5)).toThrow(
      'BusinessDate: days must be an integer',
    );
    expect(() => BusinessDate.parse('2026-10-02').addDays(10_000_000)).toThrow(
      'BusinessDate: days must be between',
    );
  });

  it('measures whole days between two dates', () => {
    const later = BusinessDate.parse('2026-10-02');
    const earlier = BusinessDate.parse('2026-10-01');
    expect(later.diffDays(earlier)).toBe(1);
    expect(earlier.diffDays(later)).toBe(-1);
    expect(later.diffDays(later)).toBe(0);
    expect(later.diffDays(BusinessDate.parse('2026-09-30'))).toBe(2);
    expect(later.diffDays(BusinessDate.parse('2024-10-02'))).toBe(730);
    expect(() => later.diffDays(null as unknown as BusinessDate)).toThrow(
      'BusinessDate: expected a BusinessDate',
    );
  });
});

describe('BusinessDate ordering', () => {
  it('orders on the calendar', () => {
    const first = BusinessDate.parse('2026-10-01');
    const second = BusinessDate.parse('2026-10-02');

    expect(first.compareTo(second)).toBe(-1);
    expect(second.compareTo(first)).toBe(1);
    expect(first.compareTo(first)).toBe(0);
    expect(first.isBefore(second)).toBe(true);
    expect(second.isAfter(first)).toBe(true);
    expect(first.isAfter(second)).toBe(false);
    expect(second.isBefore(first)).toBe(false);
  });

  it('compares across years and months, not as strings alone', () => {
    expect(BusinessDate.parse('2026-11-01').isAfter(BusinessDate.parse('2026-10-31'))).toBe(true);
    expect(BusinessDate.parse('2027-01-01').isAfter(BusinessDate.parse('2026-12-31'))).toBe(true);
    expect(() =>
      BusinessDate.parse('2026-10-01').compareTo(null as unknown as BusinessDate),
    ).toThrow('BusinessDate: expected a BusinessDate');
  });

  it('is value-based', () => {
    const date = BusinessDate.parse('2026-10-02');
    expect(date.equals(BusinessDate.of(2026, 10, 2))).toBe(true);
    expect(date.equals(BusinessDate.parse('2026-10-03'))).toBe(false);
    expect(date.equals(null as unknown as BusinessDate)).toBe(false);
  });
});

describe('conversion from an instant', () => {
  it('takes the UTC calendar day of an epoch timestamp', () => {
    expect(BusinessDate.fromUtcMillis(0).toIsoString()).toBe('1970-01-01');
    expect(BusinessDate.fromUtcMillis(Date.UTC(2026, 8, 30, 9, 22, 34)).toIsoString()).toBe(
      '2026-09-30',
    );
    expect(BusinessDate.fromUtcMillis(Date.UTC(2026, 8, 30, 23, 59, 59)).toIsoString()).toBe(
      '2026-09-30',
    );
  });

  it('takes the day of a fixed UTC offset when one is stated', () => {
    const endOfUtcDay = Date.UTC(2026, 8, 30, 23, 0, 0);
    expect(BusinessDate.fromMillisInOffset(endOfUtcDay, 0).toIsoString()).toBe('2026-09-30');
    expect(BusinessDate.fromMillisInOffset(endOfUtcDay, 120).toIsoString()).toBe('2026-10-01');
    expect(BusinessDate.fromMillisInOffset(endOfUtcDay, -120).toIsoString()).toBe('2026-09-30');
  });

  it('rejects an offset outside the range ISO 8601 allows', () => {
    const instant = Date.UTC(2026, 8, 30, 12, 0, 0);
    expect(() => BusinessDate.fromMillisInOffset(instant, 841)).toThrow(
      'BusinessDate: offsetMinutes must be between -840 and 840',
    );
    expect(() => BusinessDate.fromMillisInOffset(instant, 0.5)).toThrow(
      'BusinessDate: offsetMinutes must be an integer',
    );
  });

  it('rejects a timestamp that is not a real date', () => {
    expect(() => BusinessDate.fromUtcMillis(Number.NaN)).toThrow(InvalidPrimitiveError);
    expect(() => BusinessDate.fromUtcMillis(Number.POSITIVE_INFINITY)).toThrow(
      InvalidPrimitiveError,
    );
  });
});
