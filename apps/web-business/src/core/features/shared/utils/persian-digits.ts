const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** Converts ASCII digits to Persian digits, leaving all other characters untouched. */
export function toFaDigits(value: string): string {
  return value.replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

/** Formats a day number as two Persian digits (1 -> ۰۱, 12 -> ۱۲). */
export function padFaDay(value: number): string {
  const day = Number.isFinite(value) ? Math.min(Math.max(Math.trunc(value), 0), 99) : 0;
  return toFaDigits(String(day).padStart(2, '0'));
}
