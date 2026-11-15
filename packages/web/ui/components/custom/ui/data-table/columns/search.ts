import { formatJalali, toEnDigits } from '../date/jalali';
import { normalizeFa } from '../lib/text';
import { formatMoney } from '../lib/format';
import { getRaw, statusLabel, type ResolvedColumn } from './resolve-columns';

/**
 * Client-mode global search. Each row gets ONE precomputed, normalized haystack that is cached
 * per row object (WeakMap) — typing in the search box never re-normalizes unchanged rows.
 *
 * Searching a date works in Jalali ("1405/07", "۲۷ مهر") and in Gregorian ISO.
 */
export function createSearchIndex<T extends object>(columns: ResolvedColumn<T>[]) {
  const cache = new WeakMap<T, string>();

  const build = (row: T): string => {
    const parts: string[] = [];
    for (const rc of columns) {
      if (rc.def.searchable === false) continue;
      const raw = getRaw(rc.def, row);
      if (raw !== null && raw !== undefined && raw !== '') {
        switch (rc.type) {
          case 'date':
            parts.push(
              String(raw),
              formatJalali(String(raw), { latinDigits: true }),
              formatJalali(String(raw), { format: 'long' }),
            );
            break;
          case 'money':
          case 'number':
            parts.push(
              String(raw),
              formatMoney(Number(raw), { latinDigits: true, parentheses: false }),
            );
            break;
          case 'status':
            parts.push(String(raw), statusLabel(rc.def.status, raw));
            break;
          default:
            if (typeof raw === 'string' || typeof raw === 'number') parts.push(String(raw));
        }
      }
      if (rc.def.searchText) parts.push(rc.def.searchText(row));
    }
    return normalizeFa(parts.join(' \u0001 '));
  };

  const haystack = (row: T) => {
    let h = cache.get(row);
    if (h === undefined) {
      h = build(row);
      cache.set(row, h);
    }
    return h;
  };

  /** All whitespace-separated words must match (AND), like most accounting search boxes. */
  return function filter(rows: T[], query: string): T[] {
    const words = normalizeFa(query).split(' ').filter(Boolean);
    if (!words.length) return rows;
    // Also try the number-with-separators form: "1,234" should find 1234.
    const stripped = words.map((w) =>
      /^[\d,.٬]+$/.test(toEnDigits(w)) ? w.replace(/[,٬]/g, '') : w,
    );
    return rows.filter((row) => {
      const h = haystack(row);
      return words.every((w, i) => h.includes(w) || h.includes(stripped[i]));
    });
  };
}
