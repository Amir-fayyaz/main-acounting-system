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
import { getRaw, statusLabel } from './columns/resolve-columns';
import { DataTableContext, type DataTableContextValue } from './context';
import type { DataTableProps, PaginationMeta, ToolbarOptions } from './data-table.types';
import { ActiveFilters } from './filters/ActiveFilters';
import { MAX_SORT_COLUMNS, useClientTablePipeline } from './hooks/useClientTablePipeline';
import { useActionDialog } from './hooks/useActionDialog';
import { useColumnPersistence } from './hooks/useColumnPersistence';
import { useColumnResolve } from './hooks/useColumnResolve';
import { useInlineEdit } from './hooks/useInlineEdit';
import { useRowSelection } from './hooks/useRowSelection';
import { useTableActions } from './hooks/useTableActions';
import { useTableViewHandlers } from './hooks/useTableViewHandlers';
import { useDndModule } from './hooks/useDndModule';
import { toCsv, downloadCsv } from './lib/csv';
import { cx } from './lib/text';
import { toFaDigits } from './date/jalali';
import { PaginationControls } from './PaginationControls';
import { HeaderCell, RowView, type RowCallbacks } from './TableParts';
import { Toolbar } from './Toolbar';
import { Button, Checkbox, TableBody, TableCell, TableFooter, TableHeader, TableRow } from './ui';

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
      <TableCell
        colSpan={colSpan}
        className="whitespace-normal py-10 text-center text-muted-foreground"
      >
        {role ? <div role={role}>{children}</div> : children}
      </TableCell>
    </TableRow>
  );
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

  const onRowsReorder = (activeId: string, overId: string) => {
    if (!dndMod || !props.onRowReorder) return;
    const oldIndex = rowIds.indexOf(activeId);
    const newIndex = rowIds.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0) return;
    props.onRowReorder({
      activeId,
      overId,
      oldIndex,
      newIndex,
      rows: dndMod.arrayMove(pageData, oldIndex, newIndex),
    });
  };

  const onColumnsReorder = (activeId: string, overId: string) => {
    if (!dndMod || !byId[overId]?.reorderable) return;
    const all = table.getAllLeafColumns().map((c) => c.id);
    const from = all.indexOf(activeId);
    const to = all.indexOf(overId);
    if (from < 0 || to < 0) return;
    setColumnOrder(dndMod.arrayMove(all, from, to));
  };

  /* --------------------------------- export --------------------------------- */

  const exportCsv = () => {
    const source = isServer ? pageRows : table.getPrePaginationRowModel().rows;
    const cols = visibleColumns.filter((rc) => rc.def.key || rc.def.exportValue);
    const body = source.map((r) =>
      cols.map((rc) => {
        if (rc.def.exportValue) return rc.def.exportValue(r.original);
        const raw = getRaw(rc.def, r.original);
        if (rc.type === 'status') return statusLabel(rc.def.status, raw);
        return raw === null || raw === undefined
          ? ''
          : typeof raw === 'object'
            ? String(raw)
            : (raw as string | number | boolean);
      }),
    );
    downloadCsv(
      exportFileName ?? 'export',
      toCsv(
        cols.map((c) => c.label),
        body,
      ),
    );
  };

  /* ------------------------- stable callbacks for rows ------------------------- */

  const live = {
    select,
    startEdit,
    setDraft,
    save: saveEdit,
    cancel: cancelEdit,
    runAction,
    rowClick: (row: T) => props.onRowClick?.(row),
    setColumnFilter,
  };
  const liveRef = React.useRef(live);
  liveRef.current = live;
  const cb = React.useMemo<RowCallbacks<T>>(
    () => ({
      select: (...a) => liveRef.current.select(...a),
      startEdit: (...a) => liveRef.current.startEdit(...a),
      setDraft: (...a) => liveRef.current.setDraft(...a),
      save: () => liveRef.current.save(),
      cancel: () => liveRef.current.cancel(),
      runAction: (...a) => liveRef.current.runAction(...a),
      rowClick: (row) => liveRef.current.rowClick(row),
    }),
    [],
  );
  const ctx = React.useMemo<DataTableContextValue>(
    () => ({ setColumnFilter: (id, value) => liveRef.current.setColumnFilter(id, value) }),
    [],
  );

  /* --------------------------------- render --------------------------------- */

  const sortOf = (id: string) => {
    const i = sorting.findIndex((s) => s.id === id);
    return i < 0
      ? { dir: false as const, index: undefined }
      : {
          dir: sorting[i].desc ? ('desc' as const) : ('asc' as const),
          index: sorting.length > 1 ? i + 1 : undefined,
        };
  };

  const columnDnd = reorderableColumns && Boolean(dndMod);
  const headerCells = visibleColumns.map((rc) => {
    const s = sortOf(rc.id);
    return (
      <HeaderCell
        key={rc.id}
        column={rc}
        sort={s.dir}
        sortIndex={s.index}
        onSort={toggleSort}
        filterValue={filters[rc.id]}
        onFilter={setColumnFilter}
        density={density}
        sticky={stickyHeader}
        dnd={dndMod}
        columnDnd={columnDnd}
      />
    );
  });

  const headStick = cx(
    'whitespace-nowrap bg-muted text-xs font-semibold text-muted-foreground',
    stickyHeader && 'sticky top-0 z-20',
  );
  const headerRow = (
    <TableRow className="hover:bg-transparent">
      {rowDndWanted ? (
        <th scope="col" className={cx(headStick, 'w-10')}>
          <span className="sr-only">جابجایی</span>
        </th>
      ) : null}
      {selectable ? (
        <th scope="col" className={cx(headStick, 'w-10 px-3.5')}>
          <Checkbox
            checked={allSelected ? true : someSelected ? 'indeterminate' : false}
            aria-label="انتخاب همه‌ی ردیف‌های این صفحه"
            disabled={pageRows.length === 0}
            onCheckedChange={(v: boolean | 'indeterminate') => toggleAll(v === true)}
          />
        </th>
      ) : null}
      {rowNumbers ? (
        <th scope="col" className={cx(headStick, 'w-12 px-3.5 text-start')}>
          ردیف
        </th>
      ) : null}
      {dndMod && columnDnd ? (
        <dndMod.ColumnsContext ids={reorderableIds}>{headerCells}</dndMod.ColumnsContext>
      ) : (
        headerCells
      )}
      {hasActionsColumn ? (
        <th scope="col" className={cx(headStick, 'sticky end-0 z-20 w-px px-3.5')}>
          <span className="sr-only">عملیات</span>
        </th>
      ) : null}
    </TableRow>
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

  let body: React.ReactNode;
  if (isError) {
    body = (
      <StateRow state="error" colSpan={colSpan} role="alert">
        {error}
      </StateRow>
    );
  } else if (isLoading && !refreshing) {
    body = (
      <StateRow state="loading" colSpan={colSpan} role="status">
        {loadingMessage}
      </StateRow>
    );
  } else if (isEmpty) {
    const filtered = hasSearch || hasFilters;
    body = (
      <StateRow state={filtered ? 'empty-search' : 'empty'} colSpan={colSpan}>
        <div className="grid justify-items-center gap-3">
          <span>{filtered ? searchEmptyMessage : emptyMessage}</span>
          {hasFilters ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setFilters({});
                viewChanged();
              }}
            >
              پاک کردن فیلترها
            </Button>
          ) : null}
        </div>
      </StateRow>
    );
  } else if (virtualize) {
    const items = virtualizer.getVirtualItems();
    const padTop = items.length ? items[0].start : 0;
    const padBottom = items.length ? virtualizer.getTotalSize() - items[items.length - 1].end : 0;
    body = (
      <>
        {padTop > 0 ? (
          <tr aria-hidden style={{ height: padTop }}>
            <td colSpan={colSpan} />
          </tr>
        ) : null}
        {items.map((v) => renderRow(v.index, v))}
        {padBottom > 0 ? (
          <tr aria-hidden style={{ height: padBottom }}>
            <td colSpan={colSpan} />
          </tr>
        ) : null}
      </>
    );
  } else {
    const rowEls = pageRows.map((_, i) => renderRow(i));
    body =
      dndMod && rowDndWanted ? (
        <dndMod.RowsContext ids={rowIds}>{rowEls}</dndMod.RowsContext>
      ) : (
        rowEls
      );
  }

  const showFooter =
    !isError &&
    !isEmpty &&
    visibleColumns.some((rc) => summary?.[rc.id] !== undefined || rc.def.footer);
  const footer = showFooter ? (
    <TableFooter className="sticky bottom-0 z-10 border-t border-border bg-muted font-semibold">
      <TableRow className="hover:bg-transparent">
        {leading > 0 ? (
          <TableCell colSpan={leading} className="px-3.5 py-2.5">
            {summaryLabel}
          </TableCell>
        ) : null}
        {visibleColumns.map((rc, i) => {
          const content = summary?.[rc.id] ?? rc.def.footer?.(pageData);
          return (
            <TableCell
              key={rc.id}
              className={cx(
                'px-3.5 py-2.5',
                rc.align === 'end'
                  ? 'text-end'
                  : rc.align === 'center'
                    ? 'text-center'
                    : 'text-start',
              )}
            >
              {content ?? (i === 0 && leading === 0 ? summaryLabel : null)}
            </TableCell>
          );
        })}
        {hasActionsColumn ? <TableCell className="sticky end-0 bg-muted" /> : null}
      </TableRow>
    </TableFooter>
  ) : null;

  const tableEl = (
    <table
      className={cx('w-full caption-bottom text-sm', className)}
      aria-label={ariaLabel}
      aria-busy={isLoading || undefined}
      aria-rowcount={isServer ? total : undefined}
    >
      <TableHeader className="[&_tr]:border-b [&_tr]:border-border">{headerRow}</TableHeader>
      <TableBody className={cx(refreshing && 'pointer-events-none opacity-60 transition-opacity')}>
        {body}
      </TableBody>
      {footer}
    </table>
  );

  const pagination = ((): React.ReactNode => {
    if (isServer) {
      const ok =
        Boolean(meta) &&
        props.page !== undefined &&
        props.limit !== undefined &&
        typeof props.onPageChange === 'function' &&
        typeof props.onLimitChange === 'function';
      return ok && meta ? (
        <PaginationControls
          meta={meta}
          page={props.page!}
          limit={props.limit!}
          onPageChange={props.onPageChange!}
          onLimitChange={props.onLimitChange!}
          pageSizes={pageSizes}
        />
      ) : null;
    }
    if (!paginate || total === 0) return null;
    const m: PaginationMeta = { page, limit, total, totalPages };
    return (
      <PaginationControls
        meta={m}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
        pageSizes={pageSizes}
      />
    );
  })();

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
          {pagination ? <div className="pb-3">{pagination}</div> : null}
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
