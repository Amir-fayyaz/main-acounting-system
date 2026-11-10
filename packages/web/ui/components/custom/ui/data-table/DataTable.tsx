'use client';

import * as React from 'react';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';

import { ActionDialog, resolveReason } from './actions/ActionDialog';
import { BulkBar } from './actions/BulkBar';
import { DataTableContext } from './context';
import type { DataTableProps, PaginationMeta, ToolbarOptions } from './data-table.types';
import { ActiveFilters } from './filters/ActiveFilters';
import { MAX_SORT_COLUMNS, useClientTablePipeline } from './hooks/useClientTablePipeline';
import { useActionDialog } from './hooks/useActionDialog';
import { useColumnPersistence } from './hooks/useColumnPersistence';
import { useColumnResolve } from './hooks/useColumnResolve';
import { useInlineEdit } from './hooks/useInlineEdit';
import { useRowCallbacks } from './hooks/useRowCallbacks';
import { useRowSelection } from './hooks/useRowSelection';
import { useTableActions } from './hooks/useTableActions';
import { useTableReorder } from './hooks/useTableReorder';
import { useTableViewHandlers } from './hooks/useTableViewHandlers';
import { useDndModule } from './hooks/useDndModule';
import { downloadCsv } from './lib/csv';
import { buildCsv } from './lib/export';
import { cx } from './lib/text';
import { toFaDigits } from './date/jalali';
import { RowView } from './table/RowView';
import { TableBodyRows } from './table/TableBodyRows';
import { TableFooterRow } from './table/TableFooterRow';
import { TableHeaderRow } from './table/TableHeaderRow';
import { TablePagination } from './table/TablePagination';
import { Toolbar } from './Toolbar';
import { TableHeader } from './ui';

export const DEFAULT_LOADING_MESSAGE = 'در حال بارگذاری…';
export const DEFAULT_EMPTY_MESSAGE = 'موردی یافت نشد';
export const DEFAULT_SEARCH_EMPTY_MESSAGE = 'برای این جستجو نتیجه‌ای یافت نشد';

const EMPTY: never[] = [];
const DEFAULT_TOOLBAR: Required<ToolbarOptions> = {
  search: true,
  columns: true,
  density: true,
  export: true,
};
const defaultRowKey = (_row: unknown, index: number): React.Key => index;

function hasContent(value: React.ReactNode): boolean {
  return value !== undefined && value !== null && value !== false && value !== '';
}

/**
 * Reusable data table for accounting screens.
 *
 * - Server mode (pass `meta`): sorting / filtering / paging are delegated to your API through
 *   controlled props — use `useDataTableUrlState()` to wire them to the URL in one line.
 * - Client mode: everything runs in the browser (search, multi-column sort, column filters, paging).
 * - Dates are shown in Jalali but stored, filtered and exported as Gregorian ISO strings.
 * - Opt-in features: selection + bulk actions, row actions (confirm / reason), inline editing,
 *   row & column drag-and-drop (lazy-loaded), column visibility, density, persistence, virtualization.
 */
export function DataTable<T>(props: DataTableProps<T>) {
  const {
    columns,
    data,
    rows,
    rowKey = defaultRowKey,
    meta,
    pageSizes,
    paginate = true,
    defaultPageSize = 20,
    error,
    loading = false,
    searchTerm,
    loadingMessage = DEFAULT_LOADING_MESSAGE,
    emptyMessage = DEFAULT_EMPTY_MESSAGE,
    searchEmptyMessage = DEFAULT_SEARCH_EMPTY_MESSAGE,
    className,
    'aria-label': ariaLabel,
    selectable = false,
    rowActions,
    bulkActions,
    onRowSave,
    editReason,
    editTrigger = 'action',
    reorderableRows = false,
    reorderableColumns = false,
    virtualize = false,
    maxHeight,
    exportFileName,
    summary,
    summaryLabel = 'جمع',
    persistKey,
  } = props;

  const source = data ?? rows ?? (EMPTY as T[]);
  const isServer = (props.mode ?? (meta ? 'server' : 'client')) === 'server';
  const toolbar: Required<ToolbarOptions> | null =
    props.toolbar === false
      ? null
      : {
          ...DEFAULT_TOOLBAR,
          ...(props.toolbar === true || props.toolbar === undefined ? {} : props.toolbar),
        };

  /* ----------------------------- columns ----------------------------- */

  const { resolved, byId, tsColumns, initialVisibility, columnLabels } = useColumnResolve(columns);

  /* ------------------------------ state ------------------------------ */

  const { visibility, setVisibility, columnOrder, setColumnOrder, density, setDensity } =
    useColumnPersistence({
      persistKey,
      initialVisibility,
      byId,
      columnVisibility: props.columnVisibility,
      onColumnVisibilityChange: props.onColumnVisibilityChange,
      columnOrder: props.columnOrder,
      onColumnOrderChange: props.onColumnOrderChange,
      density: props.density,
      onDensityChange: props.onDensityChange,
    });

  /* ------------------------- client-mode pipeline ------------------------- */

  const {
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
  } = useClientTablePipeline<T>({
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
    sorting: props.sorting,
    onSortingChange: props.onSortingChange,
    columnFilters: props.columnFilters,
    onColumnFiltersChange: props.onColumnFiltersChange,
    search: props.search,
    onSearchChange: props.onSearchChange,
    page: props.page,
    onPageChange: props.onPageChange,
    limit: props.limit,
    onLimitChange: props.onLimitChange,
  });

  /* ----------------------------- inline editing ----------------------------- */

  const dialogApi = useActionDialog();
  const { dialog, openDialog, closeDialog, notice, setNotice, reportError } = dialogApi;
  const { editing, startEdit, cancelEdit, setDraft, saveEdit } = useInlineEdit<T>({
    resolved,
    pageRows,
    onRowSave,
    editReason,
    openDialog,
  });

  /* ------------------------ feature flags & layout ------------------------ */

  const hasSearch = (searchTerm ?? search).trim().length > 0;
  const rowNumbers = props.rowNumbers === true;
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
  const isError = hasContent(error);
  const isLoading = !isError && loading;
  const isEmpty = !isError && !isLoading && pageRows.length === 0;
  const refreshing = isLoading && pageRows.length > 0;

  /* ----------------------------- virtualization ----------------------------- */

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: virtualize ? pageRows.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => (density === 'compact' ? 37 : 53),
    overscan: 10,
    enabled: virtualize,
  });

  /* ------------------------------- handlers ------------------------------- */

  const {
    selection,
    clearSelection,
    select,
    toggleAll,
    selectedIds,
    selectedRows,
    allSelected,
    someSelected,
  } = useRowSelection<T>({
    rowIds,
    pageRows,
    viewKey,
    onSelectionChange: props.onSelectionChange,
  });

  const { viewChanged, toggleSort, setColumnFilter } = useTableViewHandlers<T>({
    byId,
    setSorting,
    setFilters,
    setPage,
    clearSelection,
  });

  /* -------------------------------- actions -------------------------------- */

  const { runAction, runBulk } = useTableActions<T>({
    selectedRows,
    clearSelection,
    startEdit,
    openDialog,
    reportError,
  });

  /* ------------------------ drag & drop (lazy chunk) ------------------------ */

  const { onRowsReorder, onColumnsReorder } = useTableReorder<T>({
    dndMod,
    rowIds,
    pageData,
    byId,
    table,
    onRowReorder: props.onRowReorder,
    setColumnOrder,
  });

  /* --------------------------------- export --------------------------------- */

  const exportCsv = () => {
    const rows = isServer ? pageRows : table.getPrePaginationRowModel().rows;
    downloadCsv(exportFileName ?? 'export', buildCsv(visibleColumns, rows));
  };

  /* ------------------------- stable callbacks for rows ------------------------- */

  const { cb, ctx } = useRowCallbacks<T>({
    select,
    startEdit,
    setDraft,
    save: saveEdit,
    cancel: cancelEdit,
    runAction,
    onRowClick: props.onRowClick,
    setColumnFilter,
  });

  /* --------------------------------- render --------------------------------- */

  const columnDnd = reorderableColumns && Boolean(dndMod);

  const headerRow = (
    <TableHeaderRow<T>
      visibleColumns={visibleColumns}
      sorting={sorting}
      filters={filters}
      onSort={toggleSort}
      onFilter={setColumnFilter}
      density={density}
      stickyHeader={stickyHeader}
      dnd={dndMod}
      columnDnd={columnDnd}
      reorderableIds={reorderableIds}
      rowDndWanted={rowDndWanted}
      selectable={selectable}
      allSelected={allSelected}
      someSelected={someSelected}
      onToggleAll={toggleAll}
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
        editOnDoubleClick={editTrigger === 'doubleClick' && Boolean(onRowSave)}
        clickable={Boolean(props.onRowClick)}
        density={density}
        dnd={dndMod}
        rowDnd={rowDndWanted}
        dragDisabled={rowDragDisabled}
        className={props.rowClassName?.(r.original)}
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
      onClearFilters={() => {
        setFilters({});
        viewChanged();
      }}
      virtualize={virtualize}
      virtualizer={virtualizer}
      pageRowCount={pageRows.length}
      renderRow={renderRow}
      dnd={dndMod}
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

  const paginationMeta: PaginationMeta | null = (() => {
    if (isServer) {
      const ok =
        Boolean(meta) &&
        props.page !== undefined &&
        props.limit !== undefined &&
        typeof props.onPageChange === 'function' &&
        typeof props.onLimitChange === 'function';
      return ok ? meta! : null;
    }
    if (!paginate || total === 0) return null;
    return { page, limit, total, totalPages };
  })();

  const pagination = paginationMeta ? (
    <div className="pb-3">
      <TablePagination
        meta={paginationMeta}
        page={isServer ? props.page : page}
        limit={isServer ? props.limit : limit}
        onPageChange={isServer ? props.onPageChange : setPage}
        onLimitChange={isServer ? props.onLimitChange : setLimit}
        pageSizes={pageSizes}
        resetPageOnLimitChange={!isServer}
      />
    </div>
  ) : null;

  return (
    <DataTableContext.Provider value={ctx}>
      <div data-slot="data-table" dir="rtl" className="flex flex-col gap-3">
        {toolbar ? (
          <Toolbar<T>
            options={toolbar}
            search={search}
            onSearch={(v) => {
              setSearch(v);
              viewChanged();
            }}
            searchPlaceholder={props.searchPlaceholder}
            columns={resolved}
            visibility={visibility}
            onToggleColumn={(id, v) => setVisibility((prev) => ({ ...prev, [id]: v }))}
            onResetColumns={() => {
              setVisibility(initialVisibility);
              setColumnOrder([]);
            }}
            density={density}
            onDensity={setDensity}
            onExport={exportFileName ? exportCsv : undefined}
            start={props.toolbarStart}
            end={props.toolbarEnd}
          />
        ) : null}

        <ActiveFilters
          columns={resolved}
          filters={filters}
          onRemove={(id) => setColumnFilter(id, undefined)}
          onClearAll={() => {
            setFilters({});
            viewChanged();
          }}
        />

        {selectable && bulkActions?.length ? (
          <BulkBar
            count={selectedIds.length}
            rows={selectedRows}
            actions={bulkActions}
            onRun={runBulk}
            onClear={clearSelection}
          />
        ) : null}

        {notice ? (
          <div
            role="alert"
            className="flex items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-xs underline underline-offset-4"
            >
              بستن
            </button>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div
            ref={scrollRef}
            className="overflow-auto"
            style={{ maxHeight: maxHeight ?? (virtualize ? 600 : undefined) }}
          >
            {dndMod && (rowDndWanted || columnDnd) ? (
              <dndMod.DndRoot
                rowIds={rowIds}
                columnIds={reorderableIds}
                columnLabels={columnLabels}
                onRowsReorder={onRowsReorder}
                onColumnsReorder={onColumnsReorder}
              >
                {tableEl}
              </dndMod.DndRoot>
            ) : (
              tableEl
            )}
          </div>
          {pagination}
        </div>

        <div role="status" aria-live="polite" className="sr-only">
          {isLoading ? 'در حال بارگذاری' : `${toFaDigits(total)} مورد`}
        </div>
      </div>

      <ActionDialog state={dialog} onClose={closeDialog} />
    </DataTableContext.Provider>
  );
}

export default DataTable;
