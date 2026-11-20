import { DECIMAL_SEPARATOR, toAsciiDigits } from './persian-digits';

const CANONICAL_MONEY_PATTERN = /^\d+\.\d{2}$/;
const EDITABLE_MONEY_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const ZERO_MONEY = '0.00';

/**
 * ورودی کاربر را بدون استفاده از `number` به رشته‌ی canonical با دو رقم اعشار تبدیل می‌کند.
 * ارقام فارسی/عربی، جداکننده‌ی هزارگان و ممیز فارسی پذیرفته می‌شوند.
 */
export function normalizeMoneyInput(raw: string): string | null {
  const normalized = toAsciiDigits(raw)
    .trim()
    .replace(/[٬,\s]/g, '')
    .replace(new RegExp(DECIMAL_SEPARATOR, 'g'), '.');

  if (!EDITABLE_MONEY_PATTERN.test(normalized)) return null;

  const [rawInteger = '0', rawFraction = ''] = normalized.split('.');
  const integerPart = rawInteger.replace(/^0+(?=\d)/, '') || '0';
  const fractionPart = rawFraction.padEnd(2, '0');

  return `${integerPart}.${fractionPart}`;
}

export function isCanonicalMoney(value: string): boolean {
  return CANONICAL_MONEY_PATTERN.test(value);
}

export function isPositiveMoney(value: string): boolean {
  return isCanonicalMoney(value) && value !== ZERO_MONEY;
}
