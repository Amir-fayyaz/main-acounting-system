import { getRaw, statusLabel, type ResolvedColumn } from '../columns/resolve-columns';
import { toCsv } from './csv';

/**
 * Builds the export CSV from raw values: dates stay Gregorian ISO, money stays
 * numeric, and status values use their configured label.
 */
export function buildCsv<T>(
  columns: ResolvedColumn<T>[],
  rows: ReadonlyArray<{ original: T }>,
): string {
  const cols = columns.filter((rc) => rc.def.key || rc.def.exportValue);
  const body = rows.map((r) =>
    cols.map((rc) => {
      if (rc.def.exportValue) return rc.def.exportValue(r.original);
      const raw = getRaw(rc.def, r.original);
      if (rc.type === 'status') return statusLabel(rc.def.status, raw);
      return raw === null || raw === undefined
        ? ''
        : typeof raw === 'object'
          ? String(raw)
          : (raw as string | number | boolean);
    }),
  );
  return toCsv(
    cols.map((c) => c.label),
    body,
  );
}
