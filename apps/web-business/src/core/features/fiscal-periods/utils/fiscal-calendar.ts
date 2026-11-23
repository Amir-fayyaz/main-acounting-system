import { MONTH_NAMES, toFaDigits } from './fiscal-date';

function div(a: number, b: number): number {
  return Math.trunc(a / b);
}

function mod(a: number, b: number): number {
  return a - div(a, b) * b;
}

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394,
  2456, 3178,
] as const;

interface JalaliYearInfo {
  leap: number;
  marchJdn: number;
}

interface CivilDateParts {
  year: number;
  month: number;
  day: number;
}

function gregorianDayJdn({ year, month, day }: CivilDateParts): number {
  const jdn =
    div((year + div(month - 8, 6) + 100_100) * 1461, 4) +
    div(153 * mod(month + 9, 12) + 2, 5) +
    day -
    34840408;
  return jdn - div(div(year + 100_100 + div(month - 8, 6), 100) * 3, 4) + 752;
}

function jdnToGregorianDay(jdn: number): CivilDateParts {
  const j = 4 * jdn + 139_361_631 + div(div(4 * jdn + 183_187_720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const day = div(mod(i, 153), 5) + 1;
  const month = mod(div(i, 153), 12) + 1;
  const year = div(j, 1461) - 100_100 + div(8 - month, 6);
  return { year, month, day };
}

function jalaliYearInfo(year: number): JalaliYearInfo {
  const gregorianYear = year + 621;
  let leapJ = -14;
  let jp: number = BREAKS[0];
  let jump: number = BREAKS[1] - BREAKS[0];

  for (let i = 1; i < BREAKS.length; i++) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (year < jm) break;
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

export function isJalaliLeapYear(jYear: number): boolean {
  return jalaliYearInfo(jYear).leap === 0;
}

export function jalaliDaysInMonth(jYear: number, jMonth: number): number {
  if (jMonth <= 6) return 31;
  if (jMonth <= 11) return 30;
  return isJalaliLeapYear(jYear) ? 30 : 29;
}

function daysBeforeJalaliMonth(jMonth: number): number {
  return (jMonth - 1) * 31 - div(jMonth, 7) * (jMonth - 7);
}

export interface GregorianDateParts {
  year: number;
  month: number;
  day: number;
  iso: string;
}

export function jalaliToGregorian(jYear: number, jMonth: number, jDay: number): GregorianDateParts {
  const jdn = jalaliYearInfo(jYear).marchJdn - 1 + daysBeforeJalaliMonth(jMonth) + jDay;
  const parts = jdnToGregorianDay(jdn);
  const iso = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;

  return { ...parts, iso };
}

export interface JalaliDateParts {
  jYear: number;
  jMonth: number;
  jDay: number;
}

export function gregorianToJalali(isoDate: string): JalaliDateParts {
  const parts = isoDate.split('-').map(Number);
  const jdn = gregorianDayJdn({ year: parts[0], month: parts[1], day: parts[2] });

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

/**
 * Returns Gregorian start and end ISO dates spanning exactly one Jalali year.
 * e.g. for 1405: { startDate: '2026-03-21', endDate: '2027-03-20' }
 */
export function getJalaliYearBounds(jYear: number): { startDate: string; endDate: string } {
  const start = jalaliToGregorian(jYear, 1, 1).iso;
  const lastDay = jalaliDaysInMonth(jYear, 12);
  const end = jalaliToGregorian(jYear, 12, lastDay).iso;

  return { startDate: start, endDate: end };
}

/**
 * Converts a Gregorian ISO date to Persian formatted Jalali date (e.g. '2026-03-21' -> '۱۴۰۵/۰۱/۰۱')
 */
export function formatIsoToJalaliFa(isoDate: string): string {
  if (!isoDate) return '';
  const { jYear, jMonth, jDay } = gregorianToJalali(isoDate);
  const yStr = String(jYear);
  const mStr = String(jMonth).padStart(2, '0');
  const dStr = String(jDay).padStart(2, '0');

  return toFaDigits(`${yStr}/${mStr}/${dStr}`);
}

/**
 * Returns human-readable Persian month title given Jalali year and sequence (1..12),
 * e.g. (1405, 1) -> 'فروردین ۱۴۰۵'
 */
export function getPeriodTitle(jalaliYear: number, sequence: number): string {
  const name = MONTH_NAMES[sequence - 1] ?? `دوره ${sequence}`;
  return `${name} ${toFaDigits(jalaliYear)}`;
}
