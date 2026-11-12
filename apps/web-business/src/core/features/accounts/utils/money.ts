import { DECIMAL_SEPARATOR, THOUSANDS_SEPARATOR, toAsciiDigits, toPersianDigits } from './format';

const CANONICAL_MONEY_PATTERN = /^\d+\.\d{2}$/;
const EDITABLE_MONEY_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const ZERO_MONEY = '0.00';
const BILLION = BigInt('1000000000');
const MILLION = BigInt('1000000');
const TEN = BigInt(10);
const HUNDRED = BigInt(100);

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

/** نمایش مبلغ با جداکننده‌ی هزارگان و ارقام فارسی؛ اعشار صفر حذف می‌شود. */
export function formatMoneyFa(amount: string): string {
  if (!isCanonicalMoney(amount)) return toPersianDigits(amount);

  const [integerPart = '0', fractionPart = '00'] = amount.split('.');
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);
  const fraction = fractionPart === '00' ? '' : `${DECIMAL_SEPARATOR}${fractionPart}`;

  return toPersianDigits(`${grouped}${fraction}`);
}

/**
 * جمع مبالغ canonical با BigInt؛ خروجی دوباره canonical است.
 * مبالغ نامعتبر نادیده گرفته می‌شوند تا یک ردیف خراب کل جمع را از بین نبرد.
 */
export function sumMoney(amounts: readonly string[]): string {
  const totalCents = amounts.reduce((total, amount) => {
    if (!isCanonicalMoney(amount)) return total;

    const [integerPart = '0', fractionPart = '00'] = amount.split('.');

    return total + BigInt(`${integerPart}${fractionPart}`);
  }, BigInt(0));

  return formatCents(totalCents);
}

/**
 * خلاصه‌ی مبلغ برای کارت‌های آماری، هم‌راستا با نمونه‌ی طراحی:
 * «۴٫۲ میلیارد ریال» / «۹۵۰ میلیون ریال» / مبلغ کامل برای ارقام کوچک.
 */
export function formatMoneyCompactFa(amount: string): string {
  if (!isCanonicalMoney(amount)) return toPersianDigits(amount);

  const [integerPart = '0'] = amount.split('.');
  const value = BigInt(integerPart);

  if (value >= BILLION) {
    return `${formatScaledMoney(value, BILLION)} میلیارد ریال`;
  }

  if (value >= MILLION) {
    return `${formatScaledMoney(value, MILLION)} میلیون ریال`;
  }

  return `${formatMoneyFa(amount)} ریال`;
}

function formatScaledMoney(value: bigint, unit: bigint): string {
  const tenths = (value * TEN) / unit;
  const whole = tenths / TEN;
  const fraction = tenths % TEN;
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);

  return toPersianDigits(
    fraction === BigInt(0) ? grouped : `${grouped}${DECIMAL_SEPARATOR}${fraction}`,
  );
}

function formatCents(cents: bigint): string {
  const integerPart = cents / HUNDRED;
  const fractionPart = cents % HUNDRED;

  return `${integerPart}.${fractionPart.toString().padStart(2, '0')}`;
}
