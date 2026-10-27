
import type * as React from 'react';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export type DataTableCell<T> = (
  row: T,
  index: number,
) => React.ReactNode;

interface DataTableColumnBase {
  header: React.ReactNode;
  className?: string;
  headerClassName?: string;
}


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
  rows: T[];
  rowKey?: (row: T, index: number) => React.Key;
  error?: React.ReactNode;
  loading?: boolean;
  searchTerm?: string;
  loadingMessage?: React.ReactNode;
  emptyMessage?: React.ReactNode;
  searchEmptyMessage?: React.ReactNode;
  className?: string;
  'aria-label'?: string;
  meta?: PaginationMeta;
  pageSizes?: number[];
}
