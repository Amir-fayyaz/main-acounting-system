'use client';

import * as React from 'react';
import type { ReactVirtualizer } from '@tanstack/react-virtual';

import type { ResolvedColumn } from '../columns/resolve-columns';
import type { Density, EditingState, RowAction, RowCallbacks } from '../data-table.types';
import type { FilterValue } from '../filters/filter-types';
import type { DndModule } from '../hooks/useDndModule';
import { cx } from '../lib/text';
import type { SortItem } from '../lib/url-state';
import { TableHeader } from '../ui';
import { RowView } from './RowView';
import { TableBodyRows } from './TableBodyRows';
import { TableFooterRow } from './TableFooterRow';
import { TableHeaderRow } from './TableHeaderRow';

export interface TableRowItem<T> {
  id: string;
  original: T;
}

export interface TableSurfaceProps<T> {
  /* header */
  visibleColumns: ResolvedColumn<T>[];
  sorting: SortItem[];
  filters: Record<string, FilterValue>;
  onSort: (columnId: string, multi: boolean) => void;
  onFilter: (columnId: string, value: FilterValue | undefined) => void;
  density: Density;
  stickyHeader: boolean;
  dnd: DndModule | null;
  columnDnd: boolean;
  reorderableIds: string[];
  rowDndWanted: boolean;
  selectable: boolean;
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: (checked: boolean) => void;
  rowNumbers: boolean;
  hasActionsColumn: boolean;

  /* rows */
  pageRows: TableRowItem<T>[];
  isServer: boolean;
  paginate: boolean;
  page: number;
  limit: number;
  selection: Record<string, boolean>;
  editing: EditingState | null;
  rowActions?: RowAction<T>[];
  editOnDoubleClick: boolean;
  clickable: boolean;
  rowDragDisabled: boolean;
  rowClassName?: (row: T) => string | undefined;
  cb: RowCallbacks<T>;
  virtualizer: ReactVirtualizer<HTMLDivElement, Element>;
  virtualize: boolean;
  rowIds: string[];

  /* body states */
  isError: boolean;
  error?: React.ReactNode;
  isLoading: boolean;
  refreshing: boolean;
  isEmpty: boolean;
  hasSearch: boolean;
  hasFilters: boolean;
  loadingMessage: React.ReactNode;
  emptyMessage: React.ReactNode;
  searchEmptyMessage: React.ReactNode;
  colSpan: number;
  onClearFilters: () => void;

  /* footer */
  leading: number;
  summaryLabel: React.ReactNode;
  summary?: Record<string, React.ReactNode>;
  pageData: T[];

  /* frame */
  className?: string;
  ariaLabel?: string;
  total: number;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  maxHeight?: number | string;
  onRowsReorder: (activeId: string, overId: string) => void;
  onColumnsReorder: (activeId: string, overId: string) => void;
  columnLabels: Record<string, string>;
  pagination: React.ReactNode;
}

/** Table markup inside its scroll frame, including drag-and-drop and pagination slots. */
export function TableSurface<T>({
  visibleColumns,
  sorting,
  filters,
  onSort,
  onFilter,
  density,
  stickyHeader,
  dnd,
  columnDnd,
  reorderableIds,
  rowDndWanted,
  selectable,
  allSelected,
  someSelected,
  onToggleAll,
  rowNumbers,
  hasActionsColumn,
  pageRows,
  isServer,
  paginate,
  page,
  limit,
  selection,
  editing,
  rowActions,
  editOnDoubleClick,
  clickable,
  rowDragDisabled,
  rowClassName,
  cb,
  virtualizer,
  virtualize,
  rowIds,
  isError,
  error,
  isLoading,
  refreshing,
  isEmpty,
  hasSearch,
  hasFilters,
  loadingMessage,
  emptyMessage,
  searchEmptyMessage,
  colSpan,
  onClearFilters,
  leading,
  summaryLabel,
  summary,
  pageData,
  className,
  ariaLabel,
  total,
  scrollRef,
  maxHeight,
  onRowsReorder,
  onColumnsReorder,
  columnLabels,
  pagination,
}: TableSurfaceProps<T>) {
  const headerRow = (
    <TableHeaderRow<T>
      visibleColumns={visibleColumns}
      sorting={sorting}
      filters={filters}
      onSort={onSort}
      onFilter={onFilter}
      density={density}
      stickyHeader={stickyHeader}
      dnd={dnd}
      columnDnd={columnDnd}
      reorderableIds={reorderableIds}
      rowDndWanted={rowDndWanted}
      selectable={selectable}
      allSelected={allSelected}
      someSelected={someSelected}
      onToggleAll={onToggleAll}
      pageRowCount={pageRows.length}
      rowNumbers={rowNumbers}
      hasActionsColumn={hasActionsColumn}
    />
  );

  const renderRow = (idx: number, virtualItem?: { index: number }) => {
    const r = pageRows[idx];
    return (
      <RowView<T>
        key={r.id}
        original={r.original}
        rowId={r.id}
        index={idx}
        rowNumber={
          rowNumbers
            ? (isServer ? (page - 1) * limit : paginate ? (page - 1) * limit : 0) + idx + 1
            : undefined
        }
        columns={visibleColumns}
        selectable={selectable}
        selected={Boolean(selection[r.id])}
        editing={editing?.id === r.id ? editing : null}
        locked={editing !== null}
        actions={rowActions}
        hasActionsColumn={hasActionsColumn}
        editOnDoubleClick={editOnDoubleClick}
        clickable={clickable}
        density={density}
        dnd={dnd}
        rowDnd={rowDndWanted}
        dragDisabled={rowDragDisabled}
        className={rowClassName?.(r.original)}
        cb={cb}
        dataIndex={virtualItem?.index}
        measureRef={virtualItem ? virtualizer.measureElement : undefined}
      />
    );
  };

  const body = (
    <TableBodyRows
      isError={isError}
      error={error}
      isLoading={isLoading}
      refreshing={refreshing}
      isEmpty={isEmpty}
      hasSearch={hasSearch}
      hasFilters={hasFilters}
      loadingMessage={loadingMessage}
      emptyMessage={emptyMessage}
      searchEmptyMessage={searchEmptyMessage}
      colSpan={colSpan}
      onClearFilters={onClearFilters}
      virtualize={virtualize}
      virtualizer={virtualizer}
      pageRowCount={pageRows.length}
      renderRow={renderRow}
      dnd={dnd}
      rowDndWanted={rowDndWanted}
      rowIds={rowIds}
    />
  );

  const showFooter =
    !isError &&
    !isEmpty &&
    visibleColumns.some((rc) => summary?.[rc.id] !== undefined || rc.def.footer);
  const footer = showFooter ? (
    <TableFooterRow<T>
      visibleColumns={visibleColumns}
      leading={leading}
      summaryLabel={summaryLabel}
      summary={summary}
      pageData={pageData}
      hasActionsColumn={hasActionsColumn}
    />
  ) : null;

  const tableEl = (
    <table
      className={cx('w-full caption-bottom text-sm', className)}
      aria-label={ariaLabel}
      aria-busy={isLoading || undefined}
      aria-rowcount={isServer ? total : undefined}
    >
      <TableHeader className="[&_tr]:border-b [&_tr]:border-border">{headerRow}</TableHeader>
      {body}
      {footer}
    </table>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div
        ref={scrollRef}
        className="overflow-auto"
        style={{ maxHeight: maxHeight ?? (virtualize ? 600 : undefined) }}
      >
        {dnd && (rowDndWanted || columnDnd) ? (
          <dnd.DndRoot
            rowIds={rowIds}
            columnIds={reorderableIds}
            columnLabels={columnLabels}
            onRowsReorder={onRowsReorder}
            onColumnsReorder={onColumnsReorder}
          >
            {tableEl}
          </dnd.DndRoot>
        ) : (
          tableEl
        )}
      </div>
      {pagination}
    </div>
  );
}
