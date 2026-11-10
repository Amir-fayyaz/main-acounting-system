import type * as React from 'react';

import type { JalaliFormat } from './date/jalali';
import type { ColumnFilterConfig, FilterOption, FilterValue } from './filters/filter-types';
import type { SortItem } from './lib/url-state';

/* ------------------------------------------------------------------ */
/* Original contract (unchanged)                                       */
/* ------------------------------------------------------------------ */

/** Server-provided pagination metadata from the standard list envelope. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Standard paginated API response shape. */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export type DataTableCell<T> = (row: T, index: number) => React.ReactNode;

/* ------------------------------------------------------------------ */
/* Columns                                                             */
/* ------------------------------------------------------------------ */

export type ColumnType = 'text' | 'number' | 'money' | 'date' | 'status' | 'custom';
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type StatusMap = Record<string, { label?: string; tone: StatusTone }>;

export interface EditableConfig<T> {
  /** Defaults to the column type (date → date, money → money, number → number, else text). */
  type?: 'text' | 'number' | 'money' | 'date' | 'select';
  options?: FilterOption[];
  required?: boolean;
  placeholder?: string;
  /** Return a message to block saving. `draft` has the other pending edits of the row. */
  validate?: (value: unknown, draft: Partial<T>, row: T) => string | undefined;
  /** Per-row guard (e.g. a posted journal entry must stay read-only). */
  disabled?: (row: T) => boolean;
}

interface DataTableColumnBase<T> {
  /** Defaults to `key`. Required for columns without `key`. */
  id?: string;
  header: React.ReactNode;
  /** Plain-text name for menus, filter chips and CSV when `header` is not a string. */
  label?: string;
  /** Drives default rendering, sorting, filtering, editing and export. Default: 'text'. */
  type?: ColumnType;
  align?: 'start' | 'center' | 'end';
  className?: string;
  headerClassName?: string;

  /** `true`, or a custom comparator `(a, b) => number` on the row objects. */
  sortable?: boolean | ((a: T, b: T) => number);
  /** First click sorts descending (handy for dates and amounts). */
  sortDescFirst?: boolean;

  /**
   * `true` → default filter for the column type; an object customizes it; `false` disables it.
   * Date, number, money and status columns are filterable by default.
   */
  filter?: boolean | ColumnFilterConfig;
  /** Click a cell value to filter by it (dates → that day, status → that status). Default: dates & statuses. */
  clickToFilter?: boolean;

  /** Inline (row-level) editing. `true` uses the column type. */
  editable?: boolean | EditableConfig<T>;

  /** For `type: 'status'`. */
  status?: StatusMap;
  /** For `type: 'date'`. */
  dateFormat?: JalaliFormat;
  /** Shown as a small hint in the header for money columns, e.g. "ریال". */
  currency?: string;

  hideable?: boolean;
  defaultHidden?: boolean;
  /** Set false to pin the column in place when column drag-and-drop is on. */
  reorderable?: boolean;

  /** Include in the global search box. Default true. */
  searchable?: boolean;
  /** Extra text that should be searchable for this column (e.g. a status label). */
  searchText?: (row: T) => string;

  /** Footer cell computed from the rows currently shown. Use `summary` for server totals. */
  footer?: (rows: T[]) => React.ReactNode;
  /** Raw value used in CSV export (dates stay Gregorian ISO). Defaults to the cell's raw value. */
  exportValue?: (row: T) => string | number | boolean | null | undefined;

  width?: number | string;
  minWidth?: number | string;
}

/**
 * Column definition.
 * - Provide `key` to read a field automatically, and optionally override with `cell`.
 * - Or omit `key` and supply a required `cell` renderer (and an `id`).
 */
export type DataTableColumn<T> = DataTableColumnBase<T> &
  (
    | {
        key: keyof T & string;
        cell?: DataTableCell<T>;
      }
    | {
        key?: string;
        cell: DataTableCell<T>;
      }
  );

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export interface ReasonConfig {
  /** Default true. */
  required?: boolean;
  label?: string;
  placeholder?: string;
  minLength?: number;
  /** One-tap reasons shown above the text box. */
  presets?: string[];
}

export interface ActionContext {
  reason?: string;
}

export interface ConfirmConfig<Subject> {
  title: string;
  description?: React.ReactNode | ((subject: Subject) => React.ReactNode);
  confirmLabel?: string;
}

export interface RowAction<T> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  /** `'edit'` starts inline editing of the row (no `onSelect` needed). */
  kind?: 'edit';
  variant?: 'default' | 'destructive';
  /** Render as an icon button next to the menu instead of inside it. */
  inline?: boolean;
  hidden?: (row: T) => boolean;
  /** `true`, or a string that is shown as the reason it is disabled. */
  disabled?: (row: T) => boolean | string;
  confirm?: ConfirmConfig<T>;
  /** Asks the user for a reason (stored in your audit log). */
  reason?: boolean | ReasonConfig;
  onSelect?: (row: T, ctx: ActionContext) => void | Promise<void>;
}

export interface BulkAction<T> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive';
  disabled?: (rows: T[]) => boolean;
  confirm?: ConfirmConfig<T[]>;
  reason?: boolean | ReasonConfig;
  onSelect: (rows: T[], ctx: ActionContext) => void | Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

export interface RowReorderEvent<T> {
  activeId: string;
  overId: string;
  oldIndex: number;
  newIndex: number;
  /** The rows of the current page, already in the new order. */
  rows: T[];
}

export type Density = 'compact' | 'comfortable';

export interface ToolbarOptions {
  search?: boolean;
  columns?: boolean;
  density?: boolean;
  export?: boolean;
}

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  /**
   * Row data for the current page.
   * Prefer this name — it matches the API envelope field `data`.
   */
  data?: T[];
  /**
   * @deprecated Use `data` instead. Kept so existing callers keep working.
   */
  rows?: T[];
  /** Stable key extractor. Required for selection, editing and drag-and-drop to be reliable. */
  rowKey?: (row: T, index: number) => React.Key;

  /**
   * 'server': sorting, filtering and paging are done by your API (pass `meta`).
   * 'client': everything happens in the browser. Default: 'server' when `meta` is set, else 'client'.
   */
  mode?: 'client' | 'server';

  /** When set, renders pagination controls below the table (server mode). */
  meta?: PaginationMeta;

  /**
   * Controlled pagination — required when `meta` is provided.
   * Typically come from `useDataTableUrlState()` or `usePagination()`.
   */
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  /** Allowed page-size options shown in the selector. */
  pageSizes?: number[];
  /** Client mode: set false to show every row without paging. Default true. */
  paginate?: boolean;
  /** Client mode: initial page size. Default 20. */
  defaultPageSize?: number;

  /* ---- sorting / filtering / search (controlled or uncontrolled) ---- */
  sorting?: SortItem[];
  onSortingChange?: (sorting: SortItem[]) => void;
  /** Keyed by column id. Dates are Gregorian ISO ranges `{ from, to }`. */
  columnFilters?: Record<string, FilterValue>;
  onColumnFiltersChange?: (filters: Record<string, FilterValue>) => void;
  search?: string;
  onSearchChange?: (search: string) => void;
  searchPlaceholder?: string;

  /** Show a "ردیف" number column (continues across pages). */
  rowNumbers?: boolean;

  /* ---- selection & actions ---- */
  selectable?: boolean;
  onSelectionChange?: (rows: T[], ids: string[]) => void;
  rowActions?: RowAction<T>[];
  bulkActions?: BulkAction<T>[];
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;

  /* ---- inline editing ---- */
  /** Called with only the changed fields. Throw to keep the row in edit mode and show the message. */
  onRowSave?: (row: T, patch: Partial<T>, ctx: ActionContext) => void | Promise<void>;
  /** Ask for a reason when saving an inline edit (audit trail). */
  editReason?: boolean | ReasonConfig;
  /** How a user enters edit mode besides the `kind: 'edit'` action. Default 'action'. */
  editTrigger?: 'action' | 'doubleClick';

  /* ---- drag & drop ---- */
  reorderableRows?: boolean;
  onRowReorder?: (event: RowReorderEvent<T>) => void;
  reorderableColumns?: boolean;
  columnOrder?: string[];
  onColumnOrderChange?: (order: string[]) => void;

  /* ---- view preferences ---- */
  columnVisibility?: Record<string, boolean>;
  onColumnVisibilityChange?: (visibility: Record<string, boolean>) => void;
  density?: Density;
  onDensityChange?: (density: Density) => void;
  /** Persists column visibility, order and density per user in localStorage. */
  persistKey?: string;

  /* ---- layout & performance ---- */
  /** Windowed rendering for long lists (needs `maxHeight`). Row drag-and-drop is disabled while on. */
  virtualize?: boolean;
  /** Makes the table body scroll and the header sticky. */
  maxHeight?: number | string;
  toolbar?: boolean | ToolbarOptions;
  toolbarStart?: React.ReactNode;
  toolbarEnd?: React.ReactNode;
  /** Shows an "export CSV" button; dates are exported as Gregorian ISO. */
  exportFileName?: string;
  /** Server-computed totals for the footer, keyed by column id. Overrides `column.footer`. */
  summary?: Record<string, React.ReactNode>;
  summaryLabel?: React.ReactNode;

  loading?: boolean;
  error?: React.ReactNode;
  /** Active search term; used only to pick empty vs search-empty messaging. */
  searchTerm?: string;
  loadingMessage?: React.ReactNode;
  emptyMessage?: React.ReactNode;
  searchEmptyMessage?: React.ReactNode;
  className?: string;
  'aria-label'?: string;
}

export interface PaginationControlsProps {
  meta: PaginationMeta;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  pageSizes?: number[];
}
