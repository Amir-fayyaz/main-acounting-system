import type * as React from 'react';

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

interface DataTableColumnBase {
  header: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

/**
 * Column definition.
 * - Provide `key` to read a field automatically, and optionally override with `cell`.
 * - Or omit `key` and supply a required `cell` renderer.
 */
export type DataTableColumn<T> = DataTableColumnBase &
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
  /** Stable key extractor. Strongly recommended for real lists. */
  rowKey?: (row: T, index: number) => React.Key;

  /** When set, renders pagination controls below the table. */
  meta?: PaginationMeta;

  /**
   * Controlled pagination — required when `meta` is provided.
   * Typically come from `usePagination()`.
   */
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  /** Allowed page-size options shown in the selector. */
  pageSizes?: number[];

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
