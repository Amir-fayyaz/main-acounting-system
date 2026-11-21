const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;

export const THOUSANDS_SEPARATOR = '٬';
export const DECIMAL_SEPARATOR = '٫';

/** Converts ASCII digits to Persian digits, leaving all other characters untouched. */
export function toFaDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)] ?? digit);
}

/** Converts Persian/Arabic digits back to ASCII so they can be parsed or sent to the API. */
export function toAsciiDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - '۰'.charCodeAt(0)))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - '٠'.charCodeAt(0)));
}

/** Formats a count as Persian digits for display (1200 -> ۱۲۰۰). */
export function formatCountFa(value: number): string {
  return toFaDigits(value);
}

/** Formats a day number as two Persian digits (1 -> ۰۱, 12 -> ۱۲). */
export function padFaDay(value: number): string {
  const day = Number.isFinite(value) ? Math.min(Math.max(Math.trunc(value), 0), 99) : 0;
  return toFaDigits(String(day).padStart(2, '0'));
}
