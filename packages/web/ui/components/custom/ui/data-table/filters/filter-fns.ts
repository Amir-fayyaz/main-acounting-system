import type { IsoRange } from '../date/jalali';
import { normalizeFa } from '../lib/text';
import type { NumberRange } from './filter-types';

/**
 * Client-mode filter predicates. They have the shape TanStack Table expects
 * `(row, columnId, filterValue) => boolean`, but only rely on `row.getValue`, so they
 * are trivially unit-testable with a fake row.
 */
interface RowLike {
  getValue: (columnId: string) => unknown;
}

export const textContainsFilter = (row: RowLike, columnId: string, value: string): boolean => {
  const needle = normalizeFa(value);
  return !needle || normalizeFa(row.getValue(columnId)).includes(needle);
};

export const selectFilter = (row: RowLike, columnId: string, value: string): boolean =>
  !value || String(row.getValue(columnId) ?? '') === value;

export const multiSelectFilter = (row: RowLike, columnId: string, value: string[]): boolean =>
  !value?.length || value.includes(String(row.getValue(columnId) ?? ''));

/** Inclusive range on Gregorian ISO strings (lexicographic comparison is exact for YYYY-MM-DD). */
export const dateRangeFilter = (row: RowLike, columnId: string, value: IsoRange): boolean => {
  const cell = row.getValue(columnId);
  if (!value || (!value.from && !value.to)) return true;
  if (typeof cell !== 'string' || !cell) return false;
  const day = cell.slice(0, 10);
  if (value.from && day < value.from) return false;
  if (value.to && day > value.to) return false;
  return true;
};

export const numberRangeFilter = (row: RowLike, columnId: string, value: NumberRange): boolean => {
  const cell = row.getValue(columnId);
  if (!value || (value.min === undefined && value.max === undefined)) return true;
  if (cell === null || cell === undefined || cell === '') return false;
  const n = Number(cell);
  if (Number.isNaN(n)) return false;
  if (value.min !== undefined && n < value.min) return false;
  if (value.max !== undefined && n > value.max) return false;
  return true;
};
