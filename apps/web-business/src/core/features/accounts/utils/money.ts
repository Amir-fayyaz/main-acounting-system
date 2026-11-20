import {
  DECIMAL_SEPARATOR,
  THOUSANDS_SEPARATOR,
  formatMoneyFa,
  isCanonicalMoney,
  toFaDigits,
} from '../../shared';

const BILLION = BigInt('1000000000');
const MILLION = BigInt('1000000');
const TEN = BigInt(10);
const HUNDRED = BigInt(100);

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
  if (!isCanonicalMoney(amount)) return toFaDigits(amount);

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

  return toFaDigits(
    fraction === BigInt(0) ? grouped : `${grouped}${DECIMAL_SEPARATOR}${fraction}`,
  );
}

function formatCents(cents: bigint): string {
  const integerPart = cents / HUNDRED;
  const fractionPart = cents % HUNDRED;

  return `${integerPart}.${fractionPart.toString().padStart(2, '0')}`;
}
