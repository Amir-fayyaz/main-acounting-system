import * as React from 'react';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type Table,
} from '@tanstack/react-table';

import type { ResolvedColumn } from '../columns/resolve-columns';
import { createSearchIndex } from '../columns/search';
import type { PaginationMeta } from '../data-table.types';
import { isFilterActive, type FilterValue } from '../filters/filter-types';
import type { SortItem } from '../lib/url-state';
import { useControllableState } from './useControllableState';

export const MAX_SORT_COLUMNS = 3;

type SetState<T> = (next: T | ((prev: T) => T)) => void;

export interface ClientTablePipelineOptions<T> {
  source: T[];
  isServer: boolean;
  paginate: boolean;
  defaultPageSize: number;
  rowKey: (row: T, index: number) => React.Key;
  resolved: ResolvedColumn<T>[];
  tsColumns: ColumnDef<T, unknown>[];
  byId: Record<string, ResolvedColumn<T>>;
  visibility: Record<string, boolean>;
  columnOrder: string[];
  meta?: PaginationMeta;
  sorting?: SortItem[];
  onSortingChange?: (sorting: SortItem[]) => void;
  columnFilters?: Record<string, FilterValue>;
  onColumnFiltersChange?: (filters: Record<string, FilterValue>) => void;
  search?: string;
  onSearchChange?: (search: string) => void;
  page?: number;
  onPageChange?: (page: number) => void;
  limit?: number;
  onLimitChange?: (limit: number) => void;
}

export interface ClientTablePipeline<T> {
  sorting: SortItem[];
  setSorting: SetState<SortItem[]>;
  filters: Record<string, FilterValue>;
  setFilters: SetState<Record<string, FilterValue>>;
  search: string;
  setSearch: SetState<string>;
  page: number;
  setPage: SetState<number>;
  limit: number;
  setLimit: SetState<number>;
  table: Table<T>;
  pageRows: Row<T>[];
  visibleColumns: ResolvedColumn<T>[];
  rowIds: string[];
  pageData: T[];
  total: number;
  totalPages: number;
  filtersList: Array<{ id: string; value: FilterValue }>;
  hasFilters: boolean;
  viewKey: string;
}

/**
 * Builds the TanStack table and every derived row/page value used by the UI.
 * Server mode keeps sorting/filtering/paging manual; client mode runs them locally.
 */
export function useClientTablePipeline<T>({
  source,
  isServer,
  paginate,
  defaultPageSize,
  rowKey,
  resolved,
  tsColumns,
  byId,
  visibility,
  columnOrder,
  meta,
  sorting: controlledSorting,
  onSortingChange,
  columnFilters,
  onColumnFiltersChange,
  search: controlledSearch,
  onSearchChange,
  page: controlledPage,
  onPageChange,
  limit: controlledLimit,
  onLimitChange,
}: ClientTablePipelineOptions<T>): ClientTablePipeline<T> {
  const [sorting, setSorting] = useControllableState<SortItem[]>(
    controlledSorting,
    [],
    onSortingChange,
  );
  const [filters, setFilters] = useControllableState<Record<string, FilterValue>>(
    columnFilters,
    {},
    onColumnFiltersChange,
  );
  const [search, setSearch] = useControllableState<string>(controlledSearch, '', onSearchChange);
  const [page, setPage] = useControllableState<number>(controlledPage, 1, onPageChange);
  const [limit, setLimit] = useControllableState<number>(
    controlledLimit,
    defaultPageSize,
    onLimitChange,
  );

  const searchRows = React.useMemo(
    () => createSearchIndex<T & object>(resolved as never),
    [resolved],
  );
  const searched = React.useMemo(
    () =>
      isServer || !search.trim()
        ? source
        : (searchRows(source as Array<T & object>, search) as T[]),
    [isServer, source, search, searchRows],
  );

  const filtersList = React.useMemo(
    () =>
      Object.entries(filters)
        .filter(([, v]) => isFilterActive(v))
        .map(([id, value]) => ({ id, value })),
    [filters],
  );

  const table = useReactTable<T>({
    data: searched,
    columns: tsColumns as never,
    getRowId: (row, index) => String(rowKey(row, index)),
    state: {
      sorting,
      columnFilters: filtersList,
      columnVisibility: visibility,
      columnOrder,
      pagination: { pageIndex: Math.max(0, page - 1), pageSize: limit },
    },
    manualSorting: isServer,
    manualFiltering: isServer,
    manualPagination: isServer || !paginate,
    enableMultiSort: true,
    maxMultiSortColCount: MAX_SORT_COLUMNS,
    enableSortingRemoval: true,
    autoResetPageIndex: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const pageRows = table.getRowModel().rows;
  const visibleColumns = React.useMemo(
    () =>
      table
        .getVisibleLeafColumns()
        .map((c) => byId[c.id])
        .filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table, visibility, columnOrder, byId],
  );
  const rowIds = React.useMemo(() => pageRows.map((r) => r.id), [pageRows]);
  const pageData = React.useMemo(() => pageRows.map((r) => r.original), [pageRows]);

  const total = isServer
    ? (meta?.total ?? pageRows.length)
    : table.getPrePaginationRowModel().rows.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));

  // Client mode: keep the page inside range after filtering or deleting rows.
  React.useEffect(() => {
    if (!isServer && paginate && page > totalPages) setPage(totalPages);
  }, [isServer, paginate, page, totalPages, setPage]);

  const hasFilters = filtersList.length > 0;
  // Acting on rows the user can no longer see is dangerous in accounting: reset on any view change.
  const viewKey = `${page}|${limit}|${search}|${JSON.stringify(sorting)}|${JSON.stringify(filters)}`;

  return {
    sorting,
    setSorting,
    filters,
    setFilters,
    search,
    setSearch,
    page,
    setPage,
    limit,
    setLimit,
    table,
    pageRows,
    visibleColumns,
    rowIds,
    pageData,
    total,
    totalPages,
    filtersList,
    hasFilters,
    viewKey,
  };
}
