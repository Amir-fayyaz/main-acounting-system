import { validateIntegerInRange } from './assert.js';
import { InvalidPrimitiveError } from './invalid-primitive-error.js';

/**
 * Calendar arithmetic shared by `BusinessDate` and `DateTime`.
 *
 * All of it is done in UTC on proleptic Gregorian rules, so a date is a fact
 * about the calendar and never about the server's timezone or the client's
 * locale. Which timezone a *business* day starts in stays with the domain that
 * owns that day; nothing here assumes one.
 */
export interface CivilDateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export interface InstantParts extends CivilDateParts {
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly millisecond: number;
}

export const MILLIS_PER_DAY = 86_400_000;

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

/** Days in a month, where `month` is `1..12`. */
export function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) {
    return 29;
  }
  return MONTH_LENGTHS[month - 1];
}

/** Rejects an impossible calendar date: out-of-range parts or e.g. 30 February. */
export function assertCivilDate(
  year: number,
  month: number,
  day: number,
  primitive: string,
  field: string,
): void {
  validateIntegerInRange(year, 1, 9999, primitive, `${field}.year`);
  validateIntegerInRange(month, 1, 12, primitive, `${field}.month`);
  validateIntegerInRange(day, 1, 31, primitive, `${field}.day`);
  const lastDay = daysInMonth(year, month);
  if (day > lastDay) {
    throw new InvalidPrimitiveError(
      primitive,
      `${field} has no day ${day} in ${year}-${String(month).padStart(2, '0')}; the month has ${lastDay} days`,
    );
  }
}

/**
 * Rejects an impossible instant. Seconds stop at 59: leap seconds do not exist
 * in the UTC timestamps this system stores, so admitting `:60` would create a
 * value no downstream system could round-trip.
 */
export function assertInstantParts(parts: InstantParts, primitive: string, field: string): void {
  assertCivilDate(parts.year, parts.month, parts.day, primitive, field);
  validateIntegerInRange(parts.hour, 0, 23, primitive, `${field}.hour`);
  validateIntegerInRange(parts.minute, 0, 59, primitive, `${field}.minute`);
  validateIntegerInRange(parts.second, 0, 59, primitive, `${field}.second`);
  validateIntegerInRange(parts.millisecond, 0, 999, primitive, `${field}.millisecond`);
}

/**
 * Milliseconds since the Unix epoch for the given UTC parts.
 *
 * The parts must already have been validated with {@link assertCivilDate} —
 * `Date.UTC` silently normalizes out-of-range components, which would turn a
 * rejected date into an accepted neighbouring one. The `setUTCFullYear` dance
 * exists because `Date.UTC` maps years 0-99 into the 1900s.
 */
export function toUtcMillis(parts: InstantParts): number {
  const date = new Date(
    Date.UTC(
      2000,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
      parts.millisecond,
    ),
  );
  date.setUTCFullYear(parts.year);
  return date.getTime();
}

/** Decomposes an epoch timestamp into UTC calendar parts (NaN in, NaN out). */
export function fromUtcMillis(millis: number): InstantParts {
  const date = new Date(millis);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
    millisecond: date.getUTCMilliseconds(),
  };
}

/** Whole days since the epoch for a calendar date — the basis of date arithmetic. */
export function epochDays(parts: CivilDateParts): number {
  return Math.floor(
    toUtcMillis({
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    }) / MILLIS_PER_DAY,
  );
}
