import { isValidIso, type IsoRange } from '../date/jalali';
import {
  isFilterActive,
  type FilterType,
  type FilterValue,
  type NumberRange,
} from '../filters/filter-types';

/**
 * Pure (framework-free) URL <-> table-state codec.
 *
 *   ?page=2&limit=20&search=کریمی&sort=-date,name&f.date=2026-10-17..2026-10-23&f.status=paid,partial
 *
 * `page`, `limit` and `search` keep the existing DataTable contract.
 * Dates in the URL are always Gregorian ISO, so links are stable and API-ready.
 */

export interface SortItem {
  id: string;
  desc: boolean;
}

export interface TableQueryState {
  page: number;
  limit: number;
  search: string;
  sorting: SortItem[];
  filters: Record<string, FilterValue>;
}

export interface TableUrlSchema {
  /** Column id → filter type. Only listed columns are read from / written to the URL. */
  filters?: Record<string, FilterType>;
  /** Allow-list for `sort`. When omitted every id is accepted. */
  sortable?: string[];
  maxSortColumns?: number;
  limits?: { min: number; max: number; default: number };
}

const DEFAULT_LIMITS = { min: 1, max: 200, default: 10 };
const FILTER_PREFIX = 'f.';

function toInt(value: string | null, fallback: number): number {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : fallback;
}

function parseNumberPart(s: string | undefined): number | undefined {
  if (s === undefined || s === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export function parseFilterValue(type: FilterType, raw: string): FilterValue | undefined {
  if (!raw) return undefined;
  switch (type) {
    case 'text':
    case 'select':
      return raw;
    case 'multiselect': {
      const items = raw
        .split(',')
        .map((s) => decodeURIComponent(s))
        .filter(Boolean);
      return items.length ? items : undefined;
    }
    case 'date': {
      const [from, to] = raw.split('..');
      const range: IsoRange = {};
      if (from && isValidIso(from)) range.from = from;
      if (to && isValidIso(to)) range.to = to;
      return range.from || range.to ? range : undefined;
    }
    case 'number': {
      const [min, max] = raw.split('..');
      const range: NumberRange = { min: parseNumberPart(min), max: parseNumberPart(max) };
      return range.min !== undefined || range.max !== undefined ? range : undefined;
    }
  }
}

export function stringifyFilterValue(type: FilterType, value: FilterValue): string {
  switch (type) {
    case 'text':
    case 'select':
      return String(value);
    case 'multiselect':
      return (value as string[]).map((v) => encodeURIComponent(v)).join(',');
    case 'date': {
      const r = value as IsoRange;
      return `${r.from ?? ''}..${r.to ?? ''}`;
    }
    case 'number': {
      const r = value as NumberRange;
      return `${r.min ?? ''}..${r.max ?? ''}`;
    }
  }
}

export function parseTableState(
  params: URLSearchParams,
  schema: TableUrlSchema = {},
): TableQueryState {
  const limits = schema.limits ?? DEFAULT_LIMITS;
  const limitRaw = toInt(params.get('limit'), limits.default);
  const limit = Math.min(Math.max(limitRaw, limits.min), limits.max);

  const allowed = schema.sortable ? new Set(schema.sortable) : null;
  const sorting: SortItem[] = [];
  for (const part of (params.get('sort') ?? '').split(',')) {
    if (!part) continue;
    const desc = part.startsWith('-');
    const id = desc ? part.slice(1) : part;
    if (!id || (allowed && !allowed.has(id)) || sorting.some((s) => s.id === id)) continue;
    sorting.push({ id, desc });
    if (sorting.length >= (schema.maxSortColumns ?? 3)) break;
  }

  const filters: Record<string, FilterValue> = {};
  for (const [id, type] of Object.entries(schema.filters ?? {})) {
    const raw = params.get(FILTER_PREFIX + id);
    if (raw === null) continue;
    const value = parseFilterValue(type, raw);
    if (value !== undefined) filters[id] = value;
  }

  return {
    page: toInt(params.get('page'), 1),
    limit,
    search: params.get('search') ?? '',
    sorting,
    filters,
  };
}

/** Returns a *new* URLSearchParams: unrelated params in `base` are preserved. */
export function serializeTableState(
  state: TableQueryState,
  base: URLSearchParams = new URLSearchParams(),
  schema: TableUrlSchema = {},
): URLSearchParams {
  const limits = schema.limits ?? DEFAULT_LIMITS;
  const next = new URLSearchParams(base);
  for (const key of [...next.keys()]) {
    if (
      key === 'page' ||
      key === 'limit' ||
      key === 'search' ||
      key === 'sort' ||
      key.startsWith(FILTER_PREFIX)
    )
      next.delete(key);
  }
  if (state.page > 1) next.set('page', String(state.page));
  if (state.limit !== limits.default) next.set('limit', String(state.limit));
  if (state.search.trim()) next.set('search', state.search.trim());
  if (state.sorting.length)
    next.set('sort', state.sorting.map((s) => (s.desc ? '-' : '') + s.id).join(','));
  for (const [id, type] of Object.entries(schema.filters ?? {})) {
    const value = state.filters[id];
    if (value !== undefined && isFilterActive(value))
      next.set(FILTER_PREFIX + id, stringifyFilterValue(type, value));
  }
  return next;
}
