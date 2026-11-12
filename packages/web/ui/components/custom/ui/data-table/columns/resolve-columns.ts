import type { ColumnDef, SortingFn } from '@tanstack/react-table';

import type { ColumnType, DataTableColumn, EditableConfig, StatusMap } from '../data-table.types';
import {
  dateRangeFilter,
  multiSelectFilter,
  numberRangeFilter,
  selectFilter,
  textContainsFilter,
} from '../filters/filter-fns';
import type { ColumnFilterConfig } from '../filters/filter-types';
import { compareIso } from '../date/jalali';
import { compareNumber, compareText } from '../lib/text';

export type EditorType = 'text' | 'number' | 'money' | 'date' | 'select';

export interface ResolvedEditable<T> extends EditableConfig<T> {
  type: EditorType;
}

export interface ResolvedColumn<T> {
  id: string;
  def: DataTableColumn<T>;
  label: string;
  type: ColumnType;
  align: 'start' | 'center' | 'end';
  filter: ColumnFilterConfig | null;
  editable: ResolvedEditable<T> | null;
  sortable: boolean;
  clickToFilter: boolean;
  hideable: boolean;
  reorderable: boolean;
}

export function getRaw<T>(def: DataTableColumn<T>, row: T): unknown {
  return def.key ? (row as Record<string, unknown>)[def.key] : undefined;
}

export function statusLabel(map: StatusMap | undefined, value: unknown): string {
  const key = String(value ?? '');
  return map?.[key]?.label ?? key;
}

function resolveFilter<T>(
  def: DataTableColumn<T>,
  type: ColumnType,
  label: string,
): ColumnFilterConfig | null {
  if (def.filter === false || !def.key) return null;
  if (typeof def.filter === 'object') return { label, ...def.filter };
  const explicit = def.filter === true;
  switch (type) {
    case 'date':
      return { type: 'date', label };
    case 'number':
    case 'money':
      return { type: 'number', label };
    case 'status':
      return def.status
        ? {
            type: 'multiselect',
            label,
            options: Object.entries(def.status).map(([value, s]) => ({
              value,
              label: s.label ?? value,
            })),
          }
        : null;
    case 'text':
      return explicit ? { type: 'text', label } : null;
    default:
      return null;
  }
}

function resolveEditable<T>(def: DataTableColumn<T>, type: ColumnType): ResolvedEditable<T> | null {
  if (!def.editable || !def.key) return null;
  const cfg: EditableConfig<T> = def.editable === true ? {} : def.editable;
  let editor: EditorType = cfg.type ?? 'text';
  let options = cfg.options;
  if (!cfg.type) {
    if (type === 'date') editor = 'date';
    else if (type === 'money') editor = 'money';
    else if (type === 'number') editor = 'number';
    else if (type === 'status' && def.status) {
      editor = 'select';
      options ??= Object.entries(def.status).map(([value, s]) => ({
        value,
        label: s.label ?? value,
      }));
    }
  }
  return { ...cfg, type: editor, options };
}

export function resolveColumns<T>(columns: DataTableColumn<T>[]): ResolvedColumn<T>[] {
  return columns.map((def, index) => {
    const id = def.id ?? def.key ?? `column-${index}`;
    const type: ColumnType = def.type ?? 'text';
    const label = def.label ?? (typeof def.header === 'string' ? def.header : id);
    const sortable =
      def.sortable === undefined ? Boolean(def.key) && type !== 'custom' : Boolean(def.sortable);
    return {
      id,
      def,
      label,
      type,
      align: def.align ?? (type === 'money' || type === 'number' ? 'end' : 'start'),
      filter: resolveFilter(def, type, label),
      editable: resolveEditable(def, type),
      sortable,
      clickToFilter: def.clickToFilter ?? (type === 'date' || type === 'status'),
      hideable: def.hideable ?? true,
      reorderable: def.reorderable ?? true,
    };
  });
}

function filterFnFor(filter: ColumnFilterConfig) {
  switch (filter.type) {
    case 'text':
      return textContainsFilter;
    case 'select':
      return selectFilter;
    case 'multiselect':
      return multiSelectFilter;
    case 'date':
      return dateRangeFilter;
    case 'number':
      return numberRangeFilter;
  }
}

/** Builds TanStack column defs. TanStack stays an implementation detail of the table. */
export function buildTanstackColumns<T>(resolved: ResolvedColumn<T>[]): ColumnDef<T, unknown>[] {
  return resolved.map((rc) => {
    const { def } = rc;
    const comparator = typeof def.sortable === 'function' ? def.sortable : null;

    let sortingFn: SortingFn<T>;
    if (comparator) sortingFn = (a, b) => comparator(a.original, b.original);
    else if (rc.type === 'number' || rc.type === 'money')
      sortingFn = (a, b, id) => compareNumber(a.getValue(id), b.getValue(id));
    else if (rc.type === 'date')
      sortingFn = (a, b, id) => compareIso(String(a.getValue(id)), String(b.getValue(id)));
    else if (rc.type === 'status')
      sortingFn = (a, b, id) =>
        compareText(
          statusLabel(def.status, a.getValue(id)),
          statusLabel(def.status, b.getValue(id)),
        );
    else sortingFn = (a, b, id) => compareText(a.getValue(id), b.getValue(id));

    return {
      id: rc.id,
      accessorFn: comparator
        ? (row: T) => row
        : (row: T) => {
            const v = getRaw(def, row);
            return v === null ? undefined : v;
          },
      header: rc.label,
      enableSorting: rc.sortable,
      sortingFn,
      sortUndefined: comparator ? false : 'last',
      sortDescFirst: def.sortDescFirst ?? false,
      enableColumnFilter: rc.filter !== null,
      filterFn: rc.filter ? filterFnFor(rc.filter) : undefined,
      enableHiding: rc.hideable,
      enableGlobalFilter: false,
    } as ColumnDef<T, unknown>;
  });
}
