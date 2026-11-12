import * as React from 'react';

import type { ResolvedColumn } from '../columns/resolve-columns';
import type { EditingState, RowAction } from '../data-table.types';
import { useDndModule } from './useDndModule';
import type { SortItem } from '../lib/url-state';

export interface TableLayoutOptions<T> {
  searchTerm?: string;
  search: string;
  rowNumbersProp?: boolean;
  rowActions?: RowAction<T>[];
  onRowSave?: unknown;
  onRowClick?: unknown;
  editTrigger: 'action' | 'doubleClick';
  reorderableRows: boolean;
  reorderableColumns: boolean;
  virtualize: boolean;
  maxHeight?: number | string;
  selectable: boolean;
  sorting: SortItem[];
  editing: EditingState | null;
  visibleColumns: ResolvedColumn<T>[];
  error?: React.ReactNode;
  loading: boolean;
  pageRowCount: number;
}

export function useTableLayout<T>({
  searchTerm,
  search,
  rowNumbersProp,
  rowActions,
  onRowSave,
  onRowClick,
  editTrigger,
  reorderableRows,
  reorderableColumns,
  virtualize,
  maxHeight,
  selectable,
  sorting,
  editing,
  visibleColumns,
  error,
  loading,
  pageRowCount,
}: TableLayoutOptions<T>) {
  const hasSearch = (searchTerm ?? search).trim().length > 0;
  const rowNumbers = rowNumbersProp === true;
  const hasActionsColumn =
    Boolean(rowActions?.length) || Boolean(onRowSave && editTrigger === 'doubleClick');
  const rowDndWanted = reorderableRows && !virtualize;
  const dndMod = useDndModule(rowDndWanted || reorderableColumns);
  const rowDragDisabled = sorting.length > 0 || editing !== null;
  const stickyHeader = maxHeight !== undefined || virtualize;
  const leading = (rowDndWanted ? 1 : 0) + (selectable ? 1 : 0) + (rowNumbers ? 1 : 0);
  const colSpan = visibleColumns.length + leading + (hasActionsColumn ? 1 : 0);
  const reorderableIds = React.useMemo(
    () => visibleColumns.filter((rc) => rc.reorderable).map((rc) => rc.id),
    [visibleColumns],
  );
  const columnDnd = reorderableColumns && Boolean(dndMod);
  const editOnDoubleClick = editTrigger === 'doubleClick' && Boolean(onRowSave);
  const clickable = Boolean(onRowClick);
  const isError = hasContent(error);
  const isLoading = !isError && loading;
  const isEmpty = !isError && !isLoading && pageRowCount === 0;
  const refreshing = isLoading && pageRowCount > 0;

  return {
    hasSearch,
    rowNumbers,
    hasActionsColumn,
    rowDndWanted,
    dndMod,
    rowDragDisabled,
    stickyHeader,
    leading,
    colSpan,
    reorderableIds,
    columnDnd,
    editOnDoubleClick,
    clickable,
    isError,
    isLoading,
    isEmpty,
    refreshing,
  };
}

function hasContent(value: React.ReactNode): boolean {
  return value !== undefined && value !== null && value !== false && value !== '';
}
