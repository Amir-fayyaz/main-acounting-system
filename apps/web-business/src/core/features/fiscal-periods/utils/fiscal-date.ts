import type { FiscalPeriodStatus } from '../assets/@types';

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toFaDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

export function parsePersianDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (char) => String(PERSIAN_DIGITS.indexOf(char)));
}

export const MONTH_NAMES = [
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
];

export function isPeriodPostable(status: FiscalPeriodStatus): boolean {
  return status === 'open' || status === 'reopened';
}

export const PERIOD_STATUS_LABELS: Record<FiscalPeriodStatus, string> = {
  open: 'باز',
  review: 'در بازبینی',
  closing: 'در حال بستن',
  closed: 'بسته',
  reopened: 'بازگشایی‌شده',
};

export function getPeriodStatusLabel(status: FiscalPeriodStatus): string {
  return PERIOD_STATUS_LABELS[status] ?? status;
}

export function isValidPersianDate(dateStr: string): boolean {
  const normalized = parsePersianDigits(dateStr).trim();
  const match = normalized.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return false;

  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (month > 6 && day > 30) return false;

  return true;
}
