const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const moneyFormatter = new Intl.NumberFormat('fa-IR');
const INTEGER_PATTERN = /^[+-]?\d+$/;

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

export function parseNumericDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (char) => String(PERSIAN_DIGITS.indexOf(char)))
    .replace(/[^\d]/g, '');
}

export function formatMoneyAmount(amount: string | number): string {
  const str = String(amount);
  const integerPart = str.split('.')[0].trim();
  if (integerPart === '' || integerPart === '0') return '۰';
  if (!INTEGER_PATTERN.test(integerPart)) return str;
  return moneyFormatter.format(BigInt(integerPart));
}
