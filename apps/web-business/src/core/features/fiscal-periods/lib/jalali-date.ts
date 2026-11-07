import { toPersianDigits } from '../utils/format';

export const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

const QUARTER_NAMES = ['اول', 'دوم', 'سوم', 'چهارم'] as const;

/** باقی‌مانده‌های سال کبیسه در چرخه‌ی ۳۳ ساله. */
const LEAP_REMAINDERS = new Set([1, 5, 9, 13, 17, 22, 26, 30]);

const MONTH_LENGTHS = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29] as const;

const MAX_PERIODS = 60;

export type PeriodDivision = 'monthly' | 'quarterly';

export interface JalaliDateParts {
  year: number;
  month: number;
  day: number;
}

export interface GeneratedPeriodRange {
  name: string;
  from: string;
  to: string;
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** ارقام فارسی/نیم‌فاصله‌های ورودی کاربر را به شکل قابل تجزیه درمی‌آورد. */
export function toAsciiDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - '۰'.charCodeAt(0)));
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

/** شکل استاندارد `1405/08/01` یا `null` برای ورودی نامعتبر. */
export function normalizeJalaliDate(value: string): string | null {
  const parts = parseJalaliDate(value);

  return parts ? formatJalaliParts(parts) : null;
}

export function shiftJalaliDay(
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

export function nextJalaliDay(date: string): string {
  const parts = parseJalaliDate(date);

  return parts ? formatJalaliParts(shiftJalaliDay(parts, 1)) : date;
}

export function getMonthName(month: number): string {
  return JALALI_MONTH_NAMES[month - 1] ?? '';
}

function rangeName(parts: JalaliDateParts, division: PeriodDivision): string {
  if (division === 'quarterly') {
    const quarter = QUARTER_NAMES[Math.floor((parts.month - 1) / 3)] ?? '';

    return `فصل ${quarter} ${toPersianDigits(parts.year)}`;
  }

  return `${getMonthName(parts.month)} ${toPersianDigits(parts.year)}`;
}

/**
 * تقسیم بازه‌ی `from` تا `to` به دوره‌های ماهانه یا فصلی.
 * بازه‌ی آخر به پایان سال مالی بریده می‌شود و ورودی نامعتبر خروجی خالی دارد.
 */
export function generatePeriodRanges(
  from: string,
  to: string,
  division: PeriodDivision = 'monthly',
): GeneratedPeriodRange[] {
  const start = parseJalaliDate(from);
  const end = parseJalaliDate(to);

  if (!start || !end || to < from) return [];

  const ranges: GeneratedPeriodRange[] = [];
  let cursor = formatJalaliParts(start);
  const step = division === 'quarterly' ? 3 : 1;

  while (cursor <= to && ranges.length < MAX_PERIODS) {
    const cursorParts = parseJalaliDate(cursor);
    if (!cursorParts) break;

    let targetYear = cursorParts.year;
    let targetMonth = cursorParts.month + step - 1;

    while (targetMonth > 12) {
      targetMonth -= 12;
      targetYear += 1;
    }

    const lastDayOfRange = formatJalaliParts({
      year: targetYear,
      month: targetMonth,
      day: daysInJalaliMonth(targetYear, targetMonth),
    });
    const periodEnd = lastDayOfRange > to ? to : lastDayOfRange;

    ranges.push({ name: rangeName(cursorParts, division), from: cursor, to: periodEnd });

    if (periodEnd >= to) break;

    cursor = nextJalaliDay(periodEnd);
  }

  return ranges;
}
