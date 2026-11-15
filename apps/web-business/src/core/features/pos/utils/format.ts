const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;
const THOUSANDS_SEPARATOR = '٬';
const DECIMAL_SEPARATOR = '٫';

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)] ?? digit);
}

export function toAsciiDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - '۰'.charCodeAt(0)))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - '٠'.charCodeAt(0)));
}

export function formatCountFa(value: number): string {
  return toPersianDigits(String(value));
}

export function formatJalaliDateFa(value: string): string {
  return toPersianDigits(value.replace(/-/g, '/'));
}

export { DECIMAL_SEPARATOR, THOUSANDS_SEPARATOR };
