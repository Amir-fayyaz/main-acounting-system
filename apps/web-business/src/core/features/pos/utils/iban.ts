import { normalizeIban } from '../../shared';

/** شبا را برای نمایش در جدول ماسک می‌کند؛ مقادیر غیر ایرانی دست‌نخورده برمی‌گردند. */
export function formatIbanMaskFa(value: string | null): string {
  if (!value) return '—';

  const normalized = normalizeIban(value);
  if (!normalized.startsWith('IR')) return normalized;

  return `${normalized.slice(0, 8)}…`;
}
