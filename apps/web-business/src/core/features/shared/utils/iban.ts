import { toAsciiDigits } from './persian-digits';

/** شبا را بدون فاصله/خط تیره و با حروف بزرگ یکدست می‌کند. */
export function normalizeIban(value: string): string {
  return toAsciiDigits(value)
    .replace(/[\s-]/g, '')
    .toUpperCase();
}
