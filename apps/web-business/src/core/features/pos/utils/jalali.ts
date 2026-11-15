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

function isJalaliLeapYear(year: number): boolean {
  return LEAP_REMAINDERS.has(year % 33);
}

function daysInJalaliMonth(year: number, month: number): number {
  if (month === 12) return isJalaliLeapYear(year) ? 30 : 29;

  return MONTH_LENGTHS[month - 1] ?? 0;
}

function parseJalaliDate(value: string): JalaliDateParts | null {
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

  return parts ? `${parts.year}/${pad(parts.month)}/${pad(parts.day)}` : null;
}
