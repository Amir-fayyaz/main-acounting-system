'use client';

import { ActionDialog } from './actions/ActionDialog';
import { DataTableContext } from './context';
import type { DataTableProps } from './data-table.types';
import { useActionDialog } from './hooks/useActionDialog';
import { useDataTableModel } from './hooks/useDataTableModel';
import { useInlineEdit } from './hooks/useInlineEdit';
import { useRowCallbacks } from './hooks/useRowCallbacks';
import { useRowSelection } from './hooks/useRowSelection';
import { useTableActions } from './hooks/useTableActions';
import { useTableLayout } from './hooks/useTableLayout';
import { useTableReorder } from './hooks/useTableReorder';
import { useTableVirtualizer } from './hooks/useTableVirtualizer';
import { useTableViewHandlers } from './hooks/useTableViewHandlers';
import { downloadCsv } from './lib/csv';
import { buildCsv } from './lib/export';
import { toFaDigits } from './date/jalali';
import { TableChrome } from './table/TableChrome';
import { TablePaginationSlot } from './table/TablePaginationSlot';
import { TableSurface } from './table/TableSurface';

export const DEFAULT_LOADING_MESSAGE = 'در حال بارگذاری…';
export const DEFAULT_EMPTY_MESSAGE = 'موردی یافت نشد';
export const DEFAULT_SEARCH_EMPTY_MESSAGE = 'برای این جستجو نتیجه‌ای یافت نشد';

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
    pageSizes,
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
  } = props;

  const {
    meta,
    paginate,
    isServer,
    toolbar,
    resolved,
    byId,
    columnLabels,
    initialVisibility,
    visibility,
    setVisibility,
    columnOrder,
    setColumnOrder,
    density,
    setDensity,
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
    hasFilters,
    viewKey,
  } = useDataTableModel<T>(props);

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

  const {
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
  } = useTableLayout<T>({
    searchTerm,
    search,
    rowNumbersProp: props.rowNumbers,
    rowActions,
    onRowSave,
    onRowClick: props.onRowClick,
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
    pageRowCount: pageRows.length,
  });

  const { scrollRef, virtualizer } = useTableVirtualizer({
    virtualize,
    count: pageRows.length,
    density,
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

  const pagination = (
    <TablePaginationSlot
      isServer={isServer}
      meta={meta}
      paginate={paginate}
      total={total}
      page={page}
      limit={limit}
      totalPages={totalPages}
      pageSizes={pageSizes}
      serverPage={props.page}
      serverLimit={props.limit}
      onServerPageChange={props.onPageChange}
      onServerLimitChange={props.onLimitChange}
      onClientPageChange={setPage}
      onClientLimitChange={setLimit}
    />
  );

  return (
    <DataTableContext.Provider value={ctx}>
      <div data-slot="data-table" dir="rtl" className="flex flex-col gap-3">
        <TableChrome<T>
          toolbar={toolbar}
          search={search}
          onSearch={(value) => {
            setSearch(value);
            viewChanged();
          }}
          searchPlaceholder={props.searchPlaceholder}
          columns={resolved}
          visibility={visibility}
          onToggleColumn={(id, value) => setVisibility((prev) => ({ ...prev, [id]: value }))}
          onResetColumns={() => {
            setVisibility(initialVisibility);
            setColumnOrder([]);
          }}
          density={density}
          onDensity={setDensity}
          onExport={exportFileName ? exportCsv : undefined}
          toolbarStart={props.toolbarStart}
          toolbarEnd={props.toolbarEnd}
          filters={filters}
          onRemoveFilter={(id) => setColumnFilter(id, undefined)}
          onClearFilters={() => {
            setFilters({});
            viewChanged();
          }}
          bulk={
            selectable && bulkActions?.length
              ? {
                  count: selectedIds.length,
                  rows: selectedRows,
                  actions: bulkActions,
                  onRun: runBulk,
                  onClear: clearSelection,
                }
              : null
          }
          notice={notice}
          onDismissNotice={() => setNotice(null)}
        />

        <TableSurface<T>
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
          rowNumbers={rowNumbers}
          hasActionsColumn={hasActionsColumn}
          pageRows={pageRows}
          isServer={isServer}
          paginate={paginate}
          page={page}
          limit={limit}
          selection={selection}
          editing={editing}
          rowActions={rowActions}
          editOnDoubleClick={editOnDoubleClick}
          clickable={clickable}
          rowDragDisabled={rowDragDisabled}
          rowClassName={props.rowClassName}
          cb={cb}
          virtualizer={virtualizer}
          virtualize={virtualize}
          rowIds={rowIds}
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
          leading={leading}
          summaryLabel={summaryLabel}
          summary={summary}
          pageData={pageData}
          className={className}
          ariaLabel={ariaLabel}
          total={total}
          scrollRef={scrollRef}
          maxHeight={maxHeight}
          onRowsReorder={onRowsReorder}
          onColumnsReorder={onColumnsReorder}
          columnLabels={columnLabels}
          pagination={pagination}
        />

        <div role="status" aria-live="polite" className="sr-only">
          {isLoading ? 'در حال بارگذاری' : `${toFaDigits(total)} مورد`}
        </div>
      </div>

      <ActionDialog state={dialog} onClose={closeDialog} />
    </DataTableContext.Provider>
  );
}

export default DataTable;
