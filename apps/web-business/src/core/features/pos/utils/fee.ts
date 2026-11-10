import { DECIMAL_SEPARATOR, toAsciiDigits, toPersianDigits } from './format';

const EDITABLE_FEE_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const CANONICAL_FEE_PATTERN = /^\d+\.\d{2}$/;
const MAX_FEE_CENTS = BigInt(10000);
const HUNDRED = BigInt(100);

/**
 * ورودی درصد کارمزد را بدون استفاده از `number` به رشته‌ی canonical با دو رقم اعشار تبدیل می‌کند.
 * علامت درصد، ارقام فارسی/عربی و ممیز فارسی پذیرفته می‌شوند.
 */
export function normalizeFeeInput(raw: string): string | null {
  const normalized = toAsciiDigits(raw)
    .trim()
    .replace(/[٪%]/g, '')
    .replace(/[٬,\s]/g, '')
    .replace(new RegExp(DECIMAL_SEPARATOR, 'g'), '.');

  if (!EDITABLE_FEE_PATTERN.test(normalized)) return null;

  const [rawInteger = '0', rawFraction = ''] = normalized.split('.');
  const integerPart = rawInteger.replace(/^0+(?=\d)/, '') || '0';

  return `${integerPart}.${rawFraction.padEnd(2, '0')}`;
}

export function isCanonicalFee(value: string): boolean {
  return CANONICAL_FEE_PATTERN.test(value);
}

/** درصد کارمزد باید بین ۰ تا ۱۰۰ باشد. */
export function isFeeInRange(value: string): boolean {
  if (!isCanonicalFee(value)) return false;

  const [integerPart = '0', fractionPart = '00'] = value.split('.');
  const cents = BigInt(integerPart) * HUNDRED + BigInt(fractionPart);

  return cents <= MAX_FEE_CENTS;
}

/** نمایش درصد کارمزد با ارقام فارسی و حذف اعشار صفر؛ `—` برای مقدار خالی. */
export function formatFeePercentFa(value: string | null): string {
  if (!value) return '—';
  if (!isCanonicalFee(value)) return toPersianDigits(value);

  const [integerPart = '0', fractionPart = '00'] = value.split('.');
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, '') || '0';
  const trimmedFraction = fractionPart.replace(/0+$/, '');
  const fraction = trimmedFraction ? `${DECIMAL_SEPARATOR}${trimmedFraction}` : '';

  return toPersianDigits(`${normalizedInteger}${fraction}٪`);
}
