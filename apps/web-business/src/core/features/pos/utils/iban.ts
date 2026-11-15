import { toAsciiDigits } from './format';

export function normalizeIban(value: string): string {
  return toAsciiDigits(value)
    .replace(/[\s-]/g, '')
    .toUpperCase();
}

export function formatIbanMaskFa(value: string | null): string {
  if (!value) return '—';

  const normalized = normalizeIban(value);
  if (!normalized.startsWith('IR')) return normalized;

  return `${normalized.slice(0, 8)}…`;
}
