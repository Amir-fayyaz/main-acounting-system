import type { IsoRange } from '../date/jalali';

export type FilterType = 'text' | 'select' | 'multiselect' | 'date' | 'number';

export interface FilterOption {
  value: string;
  label: string;
}

export interface NumberRange {
  min?: number;
  max?: number;
}

/** Value shapes stored in `columnFilters` (and mirrored 1:1 in the URL / API query). */
export type FilterValue = string | string[] | IsoRange | NumberRange;

export interface ColumnFilterConfig {
  type: FilterType;
  /** Required for select / multiselect. */
  options?: FilterOption[];
  placeholder?: string;
  /** Label used in the filter chip. Defaults to the column label. */
  label?: string;
}

export function isFilterActive(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object')
    return Object.values(value as object).some((v) => v !== undefined && v !== null && v !== '');
  return true;
}
