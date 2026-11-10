import { toEnDigits } from '../date/jalali';

/** Tiny class joiner (keeps the table free of clsx / tailwind-merge assumptions). */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * Normalizes Persian/Arabic text for comparing and searching:
 * Arabic ي/ك → ی/ک, all digit systems → Latin, strips ZWNJ, diacritics and tatweel, lowercases.
 */
export function normalizeFa(value: unknown): string {
  if (value === null || value === undefined) return '';
  return toEnDigits(String(value))
    .replace(/ي|ى/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ۀ/g, 'ه')
    .replace(/[\u200c\u200f\u200e\u064b-\u065f\u0640]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

let collator: Intl.Collator | undefined;

/** Persian-aware, numeric-aware comparison ("فاکتور ۲" < "فاکتور ۱۰"). */
export function compareText(a: unknown, b: unknown): number {
  collator ??= new Intl.Collator('fa', { numeric: true, sensitivity: 'base' });
  return collator.compare(normalizeFa(a), normalizeFa(b));
}

export function compareNumber(a: unknown, b: unknown): number {
  return Number(a) - Number(b);
}
