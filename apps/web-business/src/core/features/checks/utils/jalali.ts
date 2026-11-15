import { toAsciiDigits } from './format';

const LEAP_REMAINDERS = new Set([1, 5, 9, 13, 17, 22, 26, 30]);
const MONTH_LENGTHS = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29] as const;

export interface JalaliDateParts {
  year: number;
  month: number;
  day: number;
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function isJalaliLeapYear(year: number): boolean {
  return LEAP_REMAINDERS.has(year % 33);
}

export function daysInJalaliMonth(year: number, month: number): number {
  if (month === 12) return isJalaliLeapYear(year) ? 30 : 29;

  return MONTH_LENGTHS[month - 1] ?? 0;
}

export function formatJalaliParts({ year, month, day }: JalaliDateParts): string {
  return `${year}/${pad(month)}/${pad(day)}`;
}

export function parseJalaliDate(value: string): JalaliDateParts | null {
  const normalized = toAsciiDigits(value.trim()).replace(/-/g, '/');
  const match = normalized.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isSafeInteger(year) || month < 1 || month > 12) return null;
  if (day < 1 || day > daysInJalaliMonth(year, month)) return null;

  return { year, month, day };
}

/** شکل استاندارد `1405/07/27` یا `null` برای ورودی نامعتبر. */
export function normalizeJalaliDate(value: string): string | null {
  const parts = parseJalaliDate(value);

  return parts ? formatJalaliParts(parts) : null;
}

export function addJalaliDays(
  { year, month, day }: JalaliDateParts,
  days: number,
): JalaliDateParts {
  let nextYear = year;
  let nextMonth = month;
  let nextDay = day + days;

  while (nextDay > daysInJalaliMonth(nextYear, nextMonth)) {
    nextDay -= daysInJalaliMonth(nextYear, nextMonth);
    nextMonth += 1;

    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
  }

  return { year: nextYear, month: nextMonth, day: nextDay };
}

export function addJalaliDaysToDate(date: string, days: number): string | null {
  const parts = parseJalaliDate(date);

  return parts ? formatJalaliParts(addJalaliDays(parts, days)) : null;
}

/** تاریخ امروز به شکل canonical جلالی؛ فقط در تعامل کلاینتی فراخوانی می‌شود. */
export function todayJalali(reference: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(reference);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${read('year')}/${read('month').padStart(2, '0')}/${read('day').padStart(2, '0')}`;
}
