import { toEnDigits, toFaDigits } from '../date/jalali';

export interface MoneyFormatOptions {
  /** Show negatives as "(1,234)" — the accounting convention. Default: true. */
  parentheses?: boolean;
  /** Fraction digits (default 0 — Rials). */
  decimals?: number;
  latinDigits?: boolean;
  empty?: string;
}

/** 1234567 → "۱٬۲۳۴٬۵۶۷", -500 → "(۵۰۰)". */
export function formatMoney(
  value: number | null | undefined,
  opts: MoneyFormatOptions = {},
): string {
  const { parentheses = true, decimals = 0, latinDigits = false, empty = '—' } = opts;
  if (value === null || value === undefined || Number.isNaN(value)) return empty;
  const abs = Math.abs(value);
  const body = abs.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const text = latinDigits ? body : toFaDigits(body).replace(/,/g, '٬').replace(/\./g, '٫');
  if (value < 0) return parentheses ? `(${text})` : `-${text}`;
  return text;
}

export function formatNumber(
  value: number | null | undefined,
  opts: { latinDigits?: boolean; empty?: string } = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return opts.empty ?? '—';
  const text = String(value);
  return opts.latinDigits ? text : toFaDigits(text).replace(/\./g, '٫');
}

/**
 * Parses what a user types in a money/number field: any digit system, "," "٬" "،" thousands
 * separators, "٫" decimal mark, leading "-" or surrounding parentheses for negatives.
 * Returns null when the text is not a number.
 */
export function parseNumberInput(text: string | null | undefined): number | null {
  if (text === null || text === undefined) return null;
  let s = toEnDigits(String(text)).trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[,٬،\s]/g, '').replace(/٫/g, '.');
  if (s.startsWith('-') || s.startsWith('−')) {
    negative = !negative;
    s = s.slice(1);
  }
  if (!/^\d*\.?\d+$|^\d+\.$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? (negative ? -n : n) : null;
}

/** Live display while typing in a money input: groups thousands, keeps Persian digits. */
export function maskMoneyTyping(text: string): string {
  const raw = toEnDigits(text)
    .replace(/[^\d.\-٫]/g, '')
    .replace(/٫/g, '.');
  const neg = raw.startsWith('-');
  const [int = '', frac] = raw.replace(/-/g, '').split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const out =
    (neg ? '-' : '') + grouped + (frac !== undefined ? '.' + frac.replace(/\./g, '') : '');
  return toFaDigits(out).replace(/,/g, '٬').replace(/\./g, '٫');
}
