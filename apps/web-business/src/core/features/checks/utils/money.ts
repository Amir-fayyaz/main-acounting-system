import { DECIMAL_SEPARATOR, THOUSANDS_SEPARATOR, toAsciiDigits, toPersianDigits } from './format';

const CANONICAL_MONEY_PATTERN = /^\d+\.\d{2}$/;
const EDITABLE_MONEY_PATTERN = /^\d+(?:\.\d{1,2})?$/;

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
  return isCanonicalMoney(value) && value !== '0.00';
}

/** نمایش مبلغ با جداکننده‌ی هزارگان و ارقام فارسی؛ اعشار صفر حذف می‌شود. */
export function formatMoneyFa(amount: string): string {
  if (!isCanonicalMoney(amount)) return toPersianDigits(amount);

  const [integerPart = '0', fractionPart = '00'] = amount.split('.');
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);
  const fraction = fractionPart === '00' ? '' : `${DECIMAL_SEPARATOR}${fractionPart}`;

  return toPersianDigits(`${grouped}${fraction}`);
}
