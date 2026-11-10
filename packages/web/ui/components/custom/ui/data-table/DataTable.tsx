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

import { ActionDialog, resolveReason, type ActionDialogState } from './actions/ActionDialog';
import { BulkBar } from './actions/BulkBar';
import { getRaw, statusLabel } from './columns/resolve-columns';
import { DataTableContext, type DataTableContextValue } from './context';
import type {
  BulkAction,
  DataTableProps,
  PaginationMeta,
  RowAction,
  ToolbarOptions,
} from './data-table.types';
import { ActiveFilters } from './filters/ActiveFilters';
import { isFilterActive, type FilterValue } from './filters/filter-types';
import { MAX_SORT_COLUMNS, useClientTablePipeline } from './hooks/useClientTablePipeline';
import { useColumnPersistence } from './hooks/useColumnPersistence';
import { useColumnResolve } from './hooks/useColumnResolve';
import { useDndModule } from './hooks/useDndModule';
import { toCsv, downloadCsv } from './lib/csv';
import { cx } from './lib/text';
import { toFaDigits } from './date/jalali';
import { PaginationControls } from './PaginationControls';
import { HeaderCell, RowView, type EditingState, type RowCallbacks } from './TableParts';
import { Toolbar } from './Toolbar';
import { Button, Checkbox, TableBody, TableCell, TableFooter, TableHeader, TableRow } from './ui';
import type { SortItem } from './lib/url-state';

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

const sameValue = (a: unknown, b: unknown) =>
  a === b ||
  ((a === null || a === undefined || a === '') && (b === null || b === undefined || b === ''));

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
  const [selection, setSelection] = React.useState<Record<string, boolean>>({});
  const [editing, setEditing] = React.useState<EditingState | null>(null);
  const [dialog, setDialog] = React.useState<ActionDialogState | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const dialogKey = React.useRef(0);
  const lastSelected = React.useRef<string | null>(null);

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

  const clearSelection = () => {
    lastSelected.current = null;
    setSelection((prev) => (Object.keys(prev).length ? {} : prev));
  };
  const viewChanged = () => {
    setPage(1);
    clearSelection();
  };

  const toggleSort = (columnId: string, multi: boolean) => {
    const rc = byId[columnId];
    if (!rc?.sortable) return;
    const firstDesc = rc.def.sortDescFirst ?? false;
    setSorting((prev) => {
      const current = prev.find((s) => s.id === columnId);
      let next: SortItem | null;
      if (!current) next = { id: columnId, desc: firstDesc };
      else if (current.desc === firstDesc) next = { id: columnId, desc: !firstDesc };
      else next = null; // third click removes the sort
      if (!multi) return next ? [next] : [];
      const without = prev.filter((s) => s.id !== columnId);
      if (!next) return without;
      const merged = current
        ? prev.map((s) => (s.id === columnId ? next! : s))
        : [...without, next];
      return merged.slice(0, MAX_SORT_COLUMNS);
    });
    viewChanged();
  };

  const setColumnFilter = (columnId: string, value: FilterValue | undefined) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value === undefined || !isFilterActive(value)) delete next[columnId];
      else next[columnId] = value;
      return next;
    });
    viewChanged();
  };

  const select = (rowId: string, checked: boolean, shift: boolean) => {
    setSelection((prev) => {
      const next = { ...prev };
      const anchor = lastSelected.current;
      if (shift && anchor && anchor !== rowId) {
        const a = rowIds.indexOf(anchor);
        const b = rowIds.indexOf(rowId);
        if (a >= 0 && b >= 0) {
          for (const id of rowIds.slice(Math.min(a, b), Math.max(a, b) + 1)) {
            if (checked) next[id] = true;
            else delete next[id];
          }
          return next;
        }
      }
      if (checked) next[rowId] = true;
      else delete next[rowId];
      return next;
    });
    lastSelected.current = rowId;
  };

  const selectedIds = React.useMemo(
    () => rowIds.filter((id) => selection[id]),
    [rowIds, selection],
  );
  const selectedRows = React.useMemo(
    () => pageRows.filter((r) => selection[r.id]).map((r) => r.original),
    [pageRows, selection],
  );
  const allSelected = pageRows.length > 0 && selectedIds.length === pageRows.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const onSelectionChangeProp = props.onSelectionChange;
  React.useEffect(() => {
    onSelectionChangeProp?.(selectedRows, selectedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds.join('|')]);

  React.useEffect(() => {
    clearSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey]);

  /* ----------------------------- inline editing ----------------------------- */

  const startEdit = (row: T, rowId: string) => {
    if (!onRowSave) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
        console.warn('[DataTable] inline edit requested but `onRowSave` is not provided.');
      }
      return;
    }
    const draft: Record<string, unknown> = {};
    for (const rc of resolved)
      if (rc.editable && rc.def.key) draft[rc.def.key] = getRaw(rc.def, row);
    setEditing((cur) => (cur?.saving ? cur : { id: rowId, draft, errors: {}, saving: false }));
  };

  const cancelEdit = () => setEditing((cur) => (cur?.saving ? cur : null));

  const setDraft = (key: string, columnId: string, value: unknown) =>
    setEditing((cur) => {
      if (!cur) return cur;
      const errors = { ...cur.errors };
      delete errors[columnId];
      return { ...cur, draft: { ...cur.draft, [key]: value }, errors, error: undefined };
    });

  const saveEdit = () => {
    const cur = editing;
    if (!cur || cur.saving || !onRowSave) return;
    const pageRow = pageRows.find((r) => r.id === cur.id);
    if (!pageRow) {
      setEditing(null); // the row disappeared (refetch / filter change)
      return;
    }
    const row = pageRow.original;

    const errors: Record<string, string> = {};
    const patch: Record<string, unknown> = {};
    for (const rc of resolved) {
      const ed = rc.editable;
      if (!ed || !rc.def.key || ed.disabled?.(row)) continue;
      const value = cur.draft[rc.def.key];
      const empty =
        value === null ||
        value === undefined ||
        value === '' ||
        (typeof value === 'string' && !value.trim());
      const message =
        ed.required && empty
          ? 'این فیلد الزامی است'
          : ed.validate?.(value, cur.draft as Partial<T>, row);
      if (message) errors[rc.id] = message;
      if (!sameValue(value, getRaw(rc.def, row)))
        patch[rc.def.key] = typeof value === 'string' ? value.trim() : value;
    }
    if (Object.keys(errors).length) {
      setEditing({ ...cur, errors });
      return;
    }
    if (Object.keys(patch).length === 0) {
      setEditing(null);
      return;
    }

    const persist = async (reason: string | undefined, rethrow: boolean) => {
      setEditing((c) => (c ? { ...c, saving: true, error: undefined } : c));
      try {
        await onRowSave(row, patch as Partial<T>, { reason });
        setEditing(null);
      } catch (err) {
        const message =
          err instanceof Error && err.message ? err.message : 'ذخیره انجام نشد. دوباره تلاش کنید.';
        setEditing((c) => (c ? { ...c, saving: false, error: message } : c));
        if (rethrow) throw err;
      }
    };

    const reason = resolveReason(editReason);
    if (reason) {
      setDialog({
        key: ++dialogKey.current,
        title: 'ثبت ویرایش',
        description: 'دلیل این ویرایش در تاریخچه‌ی تغییرات ثبت می‌شود.',
        confirmLabel: 'ذخیره',
        reason: { label: 'دلیل ویرایش', ...reason },
        onConfirm: (r) => persist(r, true),
      });
    } else {
      void persist(undefined, false);
    }
  };

  /* -------------------------------- actions -------------------------------- */

  const runAction = (action: RowAction<T>, row: T, rowId: string) => {
    if (action.kind === 'edit') {
      startEdit(row, rowId);
      return;
    }
    const reason = resolveReason(action.reason);
    if (!action.confirm && !reason) {
      Promise.resolve(action.onSelect?.(row, {})).catch((err) =>
        setNotice(
          err instanceof Error && err.message ? err.message : `«${action.label}» انجام نشد.`,
        ),
      );
      return;
    }
    const desc = action.confirm?.description;
    setDialog({
      key: ++dialogKey.current,
      title: action.confirm?.title ?? action.label,
      description: typeof desc === 'function' ? desc(row) : desc,
      confirmLabel: action.confirm?.confirmLabel ?? action.label,
      destructive: action.variant === 'destructive',
      reason,
      onConfirm: (r) => action.onSelect?.(row, { reason: r }),
    });
  };

  const runBulk = (action: BulkAction<T>) => {
    const reason = resolveReason(action.reason);
    const rowsNow = selectedRows;
    if (!action.confirm && !reason) {
      Promise.resolve(action.onSelect(rowsNow, {})).then(clearSelection, (err) =>
        setNotice(
          err instanceof Error && err.message ? err.message : `«${action.label}» انجام نشد.`,
        ),
      );
      return;
    }
    const desc = action.confirm?.description;
    setDialog({
      key: ++dialogKey.current,
      title: action.confirm?.title ?? action.label,
      description:
        typeof desc === 'function'
          ? desc(rowsNow)
          : (desc ?? `${toFaDigits(rowsNow.length)} مورد انتخاب‌شده`),
      confirmLabel: action.confirm?.confirmLabel ?? action.label,
      destructive: action.variant === 'destructive',
      reason,
      onConfirm: async (r) => {
        await action.onSelect(rowsNow, { reason: r });
        clearSelection();
      },
    });
  };

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
            onCheckedChange={(v: boolean | 'indeterminate') => {
              setSelection(v === true ? Object.fromEntries(rowIds.map((id) => [id, true])) : {});
              lastSelected.current = null;
            }}
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

      <ActionDialog state={dialog} onClose={() => setDialog(null)} />
    </DataTableContext.Provider>
  );
}

export default DataTable;
