'use client';

import * as React from 'react';

import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
  MIN_LIMIT,
  usePagination,
} from '@repo/web/hooks/usePagination';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@repo/web/ui/components/shadcn/ui/pagination/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/web/ui/components/shadcn/ui/table/table';

/** Message shown in the loading slot. */
export const DEFAULT_LOADING_MESSAGE = 'در حال بارگذاری…';
/** Message shown when there are no rows and no active search. */
export const DEFAULT_EMPTY_MESSAGE = 'موردی یافت نشد';
/** Message shown when there are no rows and a search term is active. */
export const DEFAULT_SEARCH_EMPTY_MESSAGE = 'برای این جستجو نتیجه‌ای یافت نشد';

/** Page sizes offered by the page-size selector when the caller passes none. */
export const DEFAULT_PAGE_SIZES = [10, 20, 50, 100] as const;

/**
 * Pagination metadata of the standard `{ data, meta }` response envelope.
 * Every value the controls display — including the previous/next bounds —
 * comes from this object, never from the URL or the current row count.
 */
export interface PaginationMeta {
  /** 1-based number of the page the rows belong to. */
  page: number;
  /** Items per page; valid request range 1–100. */
  limit: number;
  /** Total number of records across all pages, reported by the server. */
  total: number;
  /** Total number of pages, reported by the server. */
  totalPages: number;
}

/** Renders one body cell. Receives the row and its index within `rows`. */
export type DataTableCell<T> = (row: T, index: number) => React.ReactNode;

interface DataTableColumnBase {
  /** Header content for this column. */
  header: React.ReactNode;
  /** Extra classes for the body cells of this column. */
  className?: string;
  /** Extra classes for this column's header cell. */
  headerClassName?: string;
}

/**
 * A column is either backed by a property of the row (the default renderer
 * then prints `row[key]`), or purely computed — in which case `cell` is
 * required because there is no property to fall back to.
 */
export type DataTableColumn<T> = DataTableColumnBase &
  (
    | {
        /** A property of the row, used as the default cell value. */
        key: keyof T & string;
        cell?: DataTableCell<T>;
      }
    | {
        /** Identifier for a column whose value only comes from `cell`. */
        key?: string;
        /** Required for computed columns — there is no property to read. */
        cell: DataTableCell<T>;
      }
  );

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  /** One entry per body row. */
  rows: T[];
  /** React key for a body row; defaults to the row index. */
  rowKey?: (row: T, index: number) => React.Key;
  /**
   * Non-empty content shows the error slot in place of the rows. Takes
   * precedence over `loading` and over any row data.
   */
  error?: React.ReactNode;
  /** Shows the loading slot in place of the rows; ignored while `error` is set. */
  loading?: boolean;
  /** The active search term; only decides which empty message is shown. */
  searchTerm?: string;
  loadingMessage?: React.ReactNode;
  emptyMessage?: React.ReactNode;
  searchEmptyMessage?: React.ReactNode;
  /** Extra classes for the `<table>` element. */
  className?: string;
  /** Accessible name for the table. */
  'aria-label'?: string;
  /**
   * Server pagination metadata from the response envelope. When present, the
   * pagination controls are rendered below the table; when absent, the table
   * renders exactly as it did without pagination.
   */
  meta?: PaginationMeta;
  /** Allowed page sizes for the selector; invalid entries are dropped. */
  pageSizes?: number[];
}

function hasContent(value: React.ReactNode): boolean {
  return value !== undefined && value !== null && value !== false && value !== '';
}

function readCellValue<T>(row: T, key: string): React.ReactNode {
  const value = (row as Record<string, unknown>)[key];
  if (value === null || value === undefined) return null;
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    React.isValidElement(value)
  ) {
    return value;
  }
  return String(value);
}

function StateRow({
  state,
  colSpan,
  children,
  role,
}: {
  state: string;
  colSpan: number;
  children: React.ReactNode;
  role?: string;
}) {
  return (
    <TableRow data-state={state}>
      <TableCell colSpan={colSpan} className="whitespace-normal text-center">
        {role ? <div role={role}>{children}</div> : children}
      </TableCell>
    </TableRow>
  );
}

/** Keeps a server-reported counter usable when the payload carries junk. */
function sanitizeInt(value: number, min: number, fallback: number): number {
  return Number.isSafeInteger(value) && value >= min ? value : fallback;
}

function sanitizeMeta(meta: PaginationMeta): Required<PaginationMeta> {
  const limit = sanitizeInt(meta.limit, MIN_LIMIT, DEFAULT_LIMIT);
  return {
    page: sanitizeInt(meta.page, DEFAULT_PAGE, DEFAULT_PAGE),
    limit: Math.min(Math.max(limit, MIN_LIMIT), MAX_LIMIT),
    total: sanitizeInt(meta.total, 0, 0),
    totalPages: sanitizeInt(meta.totalPages, 1, 1),
  };
}

/** Merges the current limit into the valid page sizes, sorted ascending. */
function resolvePageSizes(pageSizes: number[] | undefined, current: number): number[] {
  const requested = pageSizes ?? DEFAULT_PAGE_SIZES;
  const valid = requested.filter(
    (size) => Number.isSafeInteger(size) && size >= MIN_LIMIT && size <= MAX_LIMIT,
  );
  const sizes = valid.length > 0 ? valid : [...DEFAULT_PAGE_SIZES];
  const merged = sizes.includes(current) ? sizes : [...sizes, current];
  return [...merged].sort((left, right) => left - right);
}

function PaginationControls({ meta, pageSizes }: { meta: PaginationMeta; pageSizes?: number[] }) {
  const { setPage, setLimit } = usePagination();
  const selectId = React.useId();
  const { page, limit, total, totalPages } = sanitizeMeta(meta);
  const sizes = resolvePageSizes(pageSizes, limit);
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  function navigate(event: React.MouseEvent<HTMLAnchorElement>, target: number, enabled: boolean) {
    event.preventDefault();
    if (enabled) setPage(target);
  }

  return (
    <div
      data-slot="data-table-pagination"
      className="flex flex-wrap items-center justify-between gap-4 pt-3"
    >
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span data-slot="data-table-pagination-summary">
          صفحه {page} از {totalPages}
        </span>
        <span data-slot="data-table-pagination-total">{total} مورد</span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <label htmlFor={selectId}>در هر صفحه</label>
          <select
            id={selectId}
            data-slot="data-table-page-size"
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
          >
            {sizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <Pagination data-slot="data-table-pagination-nav">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={!canGoPrevious || undefined}
                className={canGoPrevious ? undefined : 'opacity-50'}
                onClick={(event) => navigate(event, page - 1, canGoPrevious)}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={!canGoNext || undefined}
                className={canGoNext ? undefined : 'opacity-50'}
                onClick={(event) => navigate(event, page + 1, canGoNext)}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}

export function DataTable<T>({
  columns,
  rows,
  rowKey = (_row, index) => index,
  error,
  loading = false,
  searchTerm,
  loadingMessage = DEFAULT_LOADING_MESSAGE,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  searchEmptyMessage = DEFAULT_SEARCH_EMPTY_MESSAGE,
  className,
  'aria-label': ariaLabel,
  meta,
  pageSizes,
}: DataTableProps<T>) {
  const isError = hasContent(error);
  const isLoading = !isError && loading;
  const isEmpty = !isError && !isLoading && rows.length === 0;
  const searchSpecific = isEmpty && (searchTerm?.trim().length ?? 0) > 0;
  const colSpan = columns.length;

  let body: React.ReactNode;
  if (isError) {
    body = (
      <StateRow state="error" colSpan={colSpan} role="alert">
        {error}
      </StateRow>
    );
  } else if (isLoading) {
    body = (
      <StateRow state="loading" colSpan={colSpan} role="status">
        {loadingMessage}
      </StateRow>
    );
  } else if (isEmpty) {
    body = (
      <StateRow state={searchSpecific ? 'empty-search' : 'empty'} colSpan={colSpan}>
        {searchSpecific ? searchEmptyMessage : emptyMessage}
      </StateRow>
    );
  } else {
    body = rows.map((row, index) => (
      <TableRow key={rowKey(row, index)}>
        {columns.map((column) => (
          <TableCell key={column.key ?? `column-${index}`} className={column.className}>
            {column.cell ? column.cell(row, index) : readCellValue(row, column.key ?? '')}
          </TableCell>
        ))}
      </TableRow>
    ));
  }

  const table = (
    <Table className={className} aria-label={ariaLabel} aria-busy={isLoading || undefined}>
      <TableHeader>
        <TableRow>
          {columns.map((column, index) => (
            <TableHead key={column.key ?? `column-${index}`} className={column.headerClassName}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>{body}</TableBody>
    </Table>
  );

  if (!meta) return table;

  return (
    <>
      {table}
      <PaginationControls meta={meta} pageSizes={pageSizes} />
    </>
  );
}

export default DataTable;
