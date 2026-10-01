import { describe, expect, it } from 'vitest';

import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';
import { DateTime } from './date-time.js';

describe('DateTime.parse', () => {
  it('reads an ISO-8601 UTC instant', () => {
    const instant = DateTime.parse('2026-09-30T09:22:34.673Z');
    expect(instant.toIsoString()).toBe('2026-09-30T09:22:34.673Z');
    expect(instant.toString()).toBe('2026-09-30T09:22:34.673Z');
    expect(instant.toJSON()).toBe('2026-09-30T09:22:34.673Z');
    expect(JSON.stringify(instant)).toBe('"2026-09-30T09:22:34.673Z"');
  });

  it('normalizes any offset to UTC', () => {
    expect(DateTime.parse('2026-09-30T03:00:00+03:30').toIsoString()).toBe(
      '2026-09-29T23:30:00.000Z',
    );
    expect(DateTime.parse('2026-09-30T00:00:00-05:00').toIsoString()).toBe(
      '2026-09-30T05:00:00.000Z',
    );
    expect(DateTime.parse('2026-09-30T00:00:00+14:00').toIsoString()).toBe(
      '2026-09-29T10:00:00.000Z',
    );
  });

  it('pads a partial fraction of a second', () => {
    expect(DateTime.parse('2026-09-30T09:22:34.6Z').toIsoString()).toBe('2026-09-30T09:22:34.600Z');
    expect(DateTime.parse('2026-09-30T09:22:34.67Z').toIsoString()).toBe(
      '2026-09-30T09:22:34.670Z',
    );
    expect(DateTime.parse('2026-09-30T09:22:34Z').toIsoString()).toBe('2026-09-30T09:22:34.000Z');
  });

  it.each([
    ['a naive date-time with no zone', '2026-09-30T09:22:34'],
    ['a date with no time', '2026-09-30'],
    ['a space instead of T', '2026-09-30 09:22:34Z'],
    ['a leap second', '2026-09-30T09:22:60Z'],
    ['an hour of 24', '2026-09-30T24:00:00Z'],
    ['a minute of 60', '2026-09-30T09:60:00Z'],
    ['a nonexistent day', '2026-02-30T00:00:00Z'],
    ['a two-digit year', '26-09-30T09:22:34Z'],
    ['an empty string', ''],
  ])('rejects %s', (_label, value) => {
    expect(() => DateTime.parse(value)).toThrow(InvalidPrimitiveError);
    expect(() => DateTime.parse(value)).toThrow('DateTime: value');
  });

  it.each([
    ['an offset past fourteen hours', '2026-09-30T00:00:00+15:00'],
    ['an offset of fourteen hours and one minute', '2026-09-30T00:00:00+14:01'],
    ['an offset with impossible minutes', '2026-09-30T00:00:00+00:99'],
  ])('rejects %s', (_label, value) => {
    expect(() => DateTime.parse(value)).toThrow('DateTime: zone offset must be within');
  });

  it('rejects a non-string at runtime', () => {
    expect(() => DateTime.parse(undefined as unknown as string)).toThrow(
      'DateTime: value must be a string',
    );
  });
});

describe('DateTime construction', () => {
  it('builds from epoch milliseconds', () => {
    expect(DateTime.fromEpochMillis(0).toIsoString()).toBe('1970-01-01T00:00:00.000Z');
    expect(DateTime.fromEpochMillis(Date.UTC(2026, 8, 30, 9, 22, 34, 673)).toIsoString()).toBe(
      '2026-09-30T09:22:34.673Z',
    );
  });

  it('rejects a timestamp outside the four-digit ISO year range', () => {
    expect(() => DateTime.fromEpochMillis(Number.NaN)).toThrow(
      'DateTime: epochMillis must be a finite',
    );
    expect(() => DateTime.fromEpochMillis(Number.POSITIVE_INFINITY)).toThrow(
      'DateTime: epochMillis must be a finite',
    );
    expect(() => DateTime.fromEpochMillis(8.65e15)).toThrow(InvalidPrimitiveError);
  });

  it('wraps a valid Date and rejects an invalid one', () => {
    expect(DateTime.from(new Date(Date.UTC(2026, 8, 30))).toIsoString()).toBe(
      '2026-09-30T00:00:00.000Z',
    );
    expect(() => DateTime.from(new Date(Number.NaN))).toThrow('DateTime: expected a valid Date');
    expect(() => DateTime.from(null as unknown as Date)).toThrow('DateTime: expected a valid Date');
  });

  it('produces the current instant', () => {
    const before = Date.now();
    const now = DateTime.now();
    const after = Date.now();
    expect(now.epochMillis).toBeGreaterThanOrEqual(before);
    expect(now.epochMillis).toBeLessThanOrEqual(after);
  });
});

describe('conversions', () => {
  it('takes the UTC calendar day of an instant', () => {
    expect(DateTime.parse('2026-09-30T23:59:59.999Z').toUtcDate().toIsoString()).toBe('2026-09-30');
    expect(DateTime.parse('2026-09-30T00:00:00Z').toUtcDate().toIsoString()).toBe('2026-09-30');
  });

  it('takes the day of a fixed UTC offset when one is stated', () => {
    const instant = DateTime.parse('2026-09-30T23:00:00Z');
    expect(instant.toDateInOffset(0).toIsoString()).toBe('2026-09-30');
    expect(instant.toDateInOffset(120).toIsoString()).toBe('2026-10-01');
    expect(instant.toDateInOffset(-840).toIsoString()).toBe('2026-09-30');
    expect(() => instant.toDateInOffset(841)).toThrow(
      'BusinessDate: offsetMinutes must be between -840 and 840',
    );
  });

  it('exposes a Date for interop without persisting one', () => {
    const instant = DateTime.parse('2026-09-30T09:22:34.673Z');
    expect(instant.toDate()).toBeInstanceOf(Date);
    expect(instant.toDate().getTime()).toBe(instant.epochMillis);
  });
});

describe('DateTime ordering', () => {
  it('orders on the instant', () => {
    const earlier = DateTime.parse('2026-09-30T09:00:00Z');
    const later = DateTime.parse('2026-09-30T10:00:00Z');

    expect(earlier.compareTo(later)).toBe(-1);
    expect(later.compareTo(earlier)).toBe(1);
    expect(earlier.compareTo(earlier)).toBe(0);
    expect(earlier.isBefore(later)).toBe(true);
    expect(later.isAfter(earlier)).toBe(true);
    expect(earlier.isAfter(later)).toBe(false);
    expect(later.isBefore(earlier)).toBe(false);
  });

  it('is value-based on the instant, not the text', () => {
    expect(
      DateTime.parse('2026-09-30T10:00:00+01:00').equals(DateTime.parse('2026-09-30T09:00:00Z')),
    ).toBe(true);
    expect(
      DateTime.parse('2026-09-30T10:00:00Z').equals(DateTime.parse('2026-09-30T09:00:00Z')),
    ).toBe(false);
    expect(DateTime.parse('2026-09-30T10:00:00Z').equals(null as unknown as DateTime)).toBe(false);
  });

  it('rejects a non-instant operand', () => {
    expect(() =>
      DateTime.parse('2026-09-30T10:00:00Z').compareTo('nope' as unknown as DateTime),
    ).toThrow('DateTime: expected a DateTime');
  });
});
