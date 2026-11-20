const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;
const THOUSANDS_SEPARATOR = '٬';
const DECIMAL_SEPARATOR = '٫';

/** تبدیل ارقام لاتین به فارسی، بدون تغییر بقیه‌ی کاراکترها. */
export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)] ?? digit);
}

/** تبدیل ارقام فارسی و عربی به لاتین تا مقایسه و اعتبارسنجی قابل اتکا باشد. */
export function toAsciiDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - '۰'.charCodeAt(0)))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - '٠'.charCodeAt(0)));
}

/** نمایش اعداد شمارشی (مثل ردیف) با ارقام فارسی. */
export function formatCountFa(value: number): string {
  return toPersianDigits(String(value));
}

/** نمایش تاریخ جلالی canonical با ارقام فارسی. */
export function formatJalaliDateFa(value: string): string {
  return toPersianDigits(value.replace(/-/g, '/'));
}

/** نمایش شماره شبا به شکل ماسک‌شده، هم‌راستا با طراحی: `IR123456…`. */
export function formatIbanMaskFa(value: string | null): string {
  if (!value) return '—';

  const normalized = toAsciiDigits(value).replace(/[\s-]/g, '').toUpperCase();
  if (!normalized.startsWith('IR')) return normalized;

  return `${normalized.slice(0, 8)}…`;
}

export { DECIMAL_SEPARATOR, THOUSANDS_SEPARATOR };
