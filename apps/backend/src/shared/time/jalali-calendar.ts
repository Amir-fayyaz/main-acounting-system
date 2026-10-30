import { describeValue, validateIntegerInRange } from '../primitives/assert.js';
import { assertCivilDate, epochDays, type CivilDateParts } from '../primitives/calendar.js';
import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';
import { BusinessDate } from './business-date.js';

/**
 * The Jalali (Shamsi) calendar — the calendar Iranian business actually works
 * in — as a pure, framework-free module.
 *
 * Everything here is fixed integer arithmetic on Julian Day Numbers and on the
 * civil calendar: it never consults the server's timezone, `Date`'s local
 * rules, or any locale, so the same Jalali year is produced in every process
 * and container. The conversion algorithm is the well-known JDN-based one of
 * the jalaali reference implementations (Khayyam/Borkowski breakpoints), the
 * de-facto standard for the Iranian calendar: months 1-6 have 31 days,
 * months 7-11 have 30, and Esfand has 30 days exactly in a leap year.
 *
 * The business-date rule the whole product follows lives here too: an instant
 * is assigned to the calendar day it falls on in the *company's timezone*
 * (Asia/Tehran by default), never to its UTC instant — a transaction at
 * 2026-03-20T21:00Z belongs to 1405-01-01, the Nawruz day in Tehran, not to
 * the UTC day it partially overlaps. The timezone is always passed or taken
 * from this one default; nothing else is ever assumed.
 */

/** The Julian Day Number of the Unix epoch (1970-01-01, noon convention). */
const JDN_OF_UNIX_EPOCH = 2_440_588;

/** How the domain names a Jalali date wherever it appears. */
export interface JalaliDate {
  readonly jYear: number;
  readonly jMonth: number;
  readonly jDay: number;
}

/** Wide year bounds of the algorithm (see `jalCal`); 1..3177 covers the product. */
const MIN_JALALI_YEAR = 1;
const MAX_JALALI_YEAR = 3177;

/** The timezone business dates are defined in unless the company says otherwise. */
export const DEFAULT_BUSINESS_TIME_ZONE = 'Asia/Tehran';

/**
 * The civil day an instant falls on in a timezone — the **business date**.
 *
 * The date comes from the wall clock of `timeZone` (an IANA name, resolved with
 * the runtime's own timezone database), evaluated explicitly and independently
 * of the server's `process.env.TZ`: the same instant is the same business date
 * on every host. A UTC flag, an offset guess or the machine's local timezone is
 * never used.
 *
 * A domain that decides a different timezone for itself passes that IANA name
 * explicitly; {@link DEFAULT_BUSINESS_TIME_ZONE} is the product's default.
 */
export function businessDateFromMillis(
  millis: number,
  timeZone: string = DEFAULT_BUSINESS_TIME_ZONE,
): BusinessDate {
  assertEpochMillis(millis);
  const parts = zonedDayParts(millis, timeZone);
  return BusinessDate.of(parts.year, parts.month, parts.day);
}

/**
 * The widest instant JavaScript `Date` can represent, ±8.64e15 ms — beyond it
 * ICU produces garbage parts, so it is rejected outright rather than wrapped.
 */
const MAX_DATE_MILLIS = 8.64e15;

function assertEpochMillis(millis: number): void {
  if (
    typeof millis !== 'number' ||
    !Number.isFinite(millis) ||
    Math.abs(millis) > MAX_DATE_MILLIS
  ) {
    throw new InvalidPrimitiveError(
      'Jalali',
      `millis must be a finite epoch timestamp within the range ±8.64e15 ms but received ${describeValue(
        millis,
      )}`,
    );
  }
}

/** The Jalali date of a civil Gregorian day. */
export function businessDateToJalali(date: BusinessDate): JalaliDate {
  return dayNumberToJalali(epochDays(date) + JDN_OF_UNIX_EPOCH);
}

/** The civil Gregorian day of a Jalali date; the result is validated as a real day. */
export function businessDateFromJalali(jYear: number, jMonth: number, jDay: number): BusinessDate {
  assertJalaliMonthDay(jYear, jMonth, jDay);
  const jdn = jalaliYearInfo(jYear).marchJdn - 1 + daysBeforeJalaliMonth(jMonth) + jDay;
  const parts = jdnToGregorianDay(jdn);
  return BusinessDate.of(parts.year, parts.month, parts.day);
}

/** Whether the Jalali year has 366 days, i.e. Esfand has 30 days. */
export function isJalaliLeapYear(jYear: number): boolean {
  return jalaliYearInfo(jYear).leap === 0;
}

/** Days in a Jalali month: 1-6 have 31, 7-11 have 30, Esfand has 29 or 30. */
export function jalaliDaysInMonth(jYear: number, jMonth: number): number {
  validateIntegerInRange(jYear, MIN_JALALI_YEAR, MAX_JALALI_YEAR, 'Jalali', 'jYear');
  validateIntegerInRange(jMonth, 1, 12, 'Jalali', 'jMonth');
  if (jMonth <= 6) {
    return 31;
  }
  if (jMonth <= 11) {
    return 30;
  }
  return isJalaliLeapYear(jYear) ? 30 : 29;
}

/** The first and last civil day of a Jalali month, as a closed range. */
export function jalaliMonthBounds(
  jYear: number,
  jMonth: number,
): { start: BusinessDate; end: BusinessDate } {
  validateIntegerInRange(jMonth, 1, 12, 'Jalali', 'jMonth');
  const start = businessDateFromJalali(jYear, jMonth, 1);
  return { start, end: businessDateFromJalali(jYear, jMonth, jalaliDaysInMonth(jYear, jMonth)) };
}

/** The first and last civil day of a Jalali year (Nowruz to the last Esfand). */
export function jalaliYearBounds(jYear: number): { start: BusinessDate; end: BusinessDate } {
  validateIntegerInRange(jYear, MIN_JALALI_YEAR, MAX_JALALI_YEAR, 'Jalali', 'jYear');
  const start = businessDateFromJalali(jYear, 1, 1);
  return { start, end: businessDateFromJalali(jYear, 12, jalaliDaysInMonth(jYear, 12)) };
}

/** The leap position and the Julian Day Number of 1 Farvardin for a Jalali year. */
interface JalaliYearInfo {
  /** The `leap` position (0 means the year is leap). */
  leap: number;
  /** Julian Day Number of 1 Farvardin. */
  marchJdn: number;
}

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394,
  2456, 3178,
] as const;

/**
 * Computes the leap flag and the Gregorian date of Farvardin 1st of a Jalali
 * year, on the Khayyam/Borkowski 33-year cycle breakpoints — the reference
 * definition of the Iranian calendar (Behrooz Astro; Fourmilab document).
 */
function jalaliYearInfo(jYear: number): JalaliYearInfo {
  const year = validateIntegerInRange(jYear, MIN_JALALI_YEAR, MAX_JALALI_YEAR, 'Jalali', 'jYear');
  const gregorianYear = year + 621;
  let leapJ = -14;
  let jp: number = BREAKS[0];
  let jump: number = BREAKS[1] - BREAKS[0];
  for (let i = 1; i < BREAKS.length; i++) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (year < jm) {
      break;
    }
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = year - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) {
    leapJ += 1;
  }
  const leapG = div(gregorianYear, 4) - div((div(gregorianYear, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) {
    n = n - jump + div(jump + 4, 33) * 33;
  }
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) {
    leap = 4;
  }
  return { leap, marchJdn: gregorianDayJdn({ year: gregorianYear, month: 3, day: march }) };
}

/** Cumulative civil days before a Jalali month within its year (not counting Esfand's shape). */
function daysBeforeJalaliMonth(jMonth: number): number {
  return (jMonth - 1) * 31 - div(jMonth, 7) * (jMonth - 7);
}

/** Julian Day Number of a proleptic Gregorian day. */
function gregorianDayJdn({ year, month, day }: CivilDateParts): number {
  const jdn =
    div((year + div(month - 8, 6) + 100_100) * 1461, 4) +
    div(153 * mod(month + 9, 12) + 2, 5) +
    day -
    34840408;
  return jdn - div(div(year + 100_100 + div(month - 8, 6), 100) * 3, 4) + 752;
}

/** Proleptic Gregorian day of a Julian Day Number. */
function jdnToGregorianDay(jdn: number): CivilDateParts {
  const j = 4 * jdn + 139_361_631 + div(div(4 * jdn + 183_187_720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const day = div(mod(i, 153), 5) + 1;
  const month = mod(div(i, 153), 12) + 1;
  const year = div(j, 1461) - 100_100 + div(8 - month, 6);
  return { year, month, day };
}

function dayNumberToJalali(jdn: number): JalaliDate {
  const gregorianYear = jdnToGregorianDay(jdn).year;
  let jYear = gregorianYear - 621;
  const info = jalaliYearInfo(jYear);
  const jdn1f = info.marchJdn;
  let k = jdn - jdn1f;
  if (k >= 0 && k <= 185) {
    return { jYear, jMonth: div(k, 31) + 1, jDay: mod(k, 31) + 1 };
  }
  if (k >= 0) {
    k -= 186;
  } else {
    jYear -= 1;
    k += 179;
    if (info.leap === 1) {
      k += 1;
    }
  }
  return { jYear, jMonth: div(k, 30) + 7, jDay: mod(k, 30) + 1 };
}

function assertJalaliMonthDay(jYear: number, jMonth: number, jDay: number): void {
  validateIntegerInRange(jYear, MIN_JALALI_YEAR, MAX_JALALI_YEAR, 'Jalali', 'jYear');
  validateIntegerInRange(jMonth, 1, 12, 'Jalali', 'jMonth');
  validateIntegerInRange(jDay, 1, 31, 'Jalali', 'jDay');
  const lastDay = jalaliDaysInMonth(jYear, jMonth);
  if (jDay > lastDay) {
    throw new InvalidPrimitiveError(
      'Jalali',
      `jDay has no day ${jDay}; month ${jMonth} of Jalali year ${jYear} has ${lastDay} days`,
    );
  }
}

const DAY_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function zonedDayParts(
  millis: number,
  timeZone: string,
): { year: number; month: number; day: number } {
  let formatter = DAY_FORMATTERS.get(timeZone);
  if (formatter === undefined) {
    try {
      formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      // Formatting once exercises the timezone name eagerly, so an unknown
      // timezone fails before it is ever cached.
      formatter.format(new Date(0));
      DAY_FORMATTERS.set(timeZone, formatter);
    } catch {
      throw new InvalidPrimitiveError(
        'Jalali',
        `timeZone must be a known IANA timezone name but received ${describeValue(timeZone)}`,
      );
    }
  }
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(millis)).map((part) => [part.type, part.value]),
  );
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  assertCivilDate(year, month, day, 'Jalali', 'businessDate');
  return { year, month, day };
}

/** Integer division truncating toward zero — the arithmetic the breakpoints assume. */
function div(value: number, divisor: number): number {
  return Math.trunc(value / divisor);
}

/** Remainder with the sign of the dividend (like JS `%`). */
function mod(value: number, divisor: number): number {
  return value - Math.trunc(value / divisor) * divisor;
}
