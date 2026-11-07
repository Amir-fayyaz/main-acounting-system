const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;
const THOUSANDS_SEPARATOR = '٬';

/** تبدیل ارقام لاتین به فارسی، بدون تغییر بقیه‌ی کاراکترها. */
export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)] ?? digit);
}

/**
 * قالب‌بندی عدد با جداکننده‌ی هزارگان و ارقام فارسی.
 * عمداً از `toLocaleString` استفاده نمی‌شود تا خروجی روی سرور و کلاینت یکسان باشد.
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';

  const [integerPart = '0', fractionPart] = Math.abs(value).toString().split('.');
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);
  const sign = value < 0 ? '-' : '';

  return toPersianDigits(`${sign}${grouped}${fractionPart ? `.${fractionPart}` : ''}`);
}

/** نمایش تاریخ شمسی (`1405/08/01`) با ارقام فارسی و جداکننده‌ی اسلش. */
export function formatJalaliDate(date: string): string {
  return toPersianDigits(date.replace(/-/g, '/'));
}

/** زمان ثبت لاگ ممیزی؛ فقط در تعامل کلاینتی فراخوانی می‌شود. */
export function formatAuditTimestamp(date: Date = new Date()): string {
  const day = date.toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const time = date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  return `${day} · ${time}`;
}
