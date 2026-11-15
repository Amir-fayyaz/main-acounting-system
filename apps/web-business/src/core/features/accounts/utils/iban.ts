import { toAsciiDigits } from './format';

export function normalizeIban(value: string): string {
  return toAsciiDigits(value)
    .replace(/[\s-]/g, '')
    .toUpperCase();
}
