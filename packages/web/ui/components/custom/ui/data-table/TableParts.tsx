'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

import { RowActions } from './actions/RowActions';
import { getRaw, type ResolvedColumn } from './columns/resolve-columns';
import { DateCell, MoneyCell, NumberCell, StatusCell } from './cells/cells';
import type { Density, RowAction } from './data-table.types';
import { toFaDigits } from './date/jalali';
import { EditableCell } from './editing/EditableCell';
import { ColumnFilterButton } from './filters/ColumnFilter';
import type { FilterValue } from './filters/filter-types';
import type { DndModule } from './hooks/useDndModule';
import { cx } from './lib/text';
import { Checkbox, TableCell, TableHead, TableRow } from './ui';

/* ------------------------------------------------------------------ */
/* Shared shapes                                                       */
/* ------------------------------------------------------------------ */

export interface EditingState {
  id: string;
  /** Pending values keyed by the column's data key. */
  draft: Record<string, unknown>;
  /** Validation messages keyed by column id. */
  errors: Record<string, string>;
  saving: boolean;
  /** Error thrown by onRowSave. */
  error?: string;
}

/** Stable (identity never changes) callbacks so memoized rows don't re-render. */
export interface RowCallbacks<T> {
  select: (rowId: string, checked: boolean, shift: boolean) => void;
  startEdit: (row: T, rowId: string) => void;
  setDraft: (key: string, columnId: string, value: unknown) => void;
  save: () => void;
  cancel: () => void;
  runAction: (action: RowAction<T>, row: T, rowId: string) => void;
  rowClick: (row: T) => void;
}

const density = {
  compact: { cell: 'px-3 py-1.5', head: 'h-9' },
  comfortable: { cell: 'px-3.5 py-3', head: 'h-11' },
} as const;

const alignClass = { start: 'text-start', center: 'text-center', end: 'text-end' } as const;
const justifyClass = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
} as const;

const INTERACTIVE =
  'button,a,input,select,textarea,label,[role="checkbox"],[role="menuitem"],[role="option"]';

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

export interface HeaderCellProps<T> {
  column: ResolvedColumn<T>;
  sort: false | 'asc' | 'desc';
  /** 1-based position when several columns are sorted. */
  sortIndex?: number;
  onSort: (columnId: string, multi: boolean) => void;
  filterValue: FilterValue | undefined;
  onFilter: (columnId: string, value: FilterValue | undefined) => void;
  density: Density;
  sticky: boolean;
  dnd: DndModule | null;
  /** Column drag-and-drop is enabled for this table. */
  columnDnd: boolean;
}

export function HeaderCell<T>({
  column: rc,
  sort,
  sortIndex,
  onSort,
  filterValue,
  onFilter,
  density: d,
  sticky,
  dnd,
  columnDnd,
}: HeaderCellProps<T>) {
  const draggable = Boolean(dnd && columnDnd);
  const style: React.CSSProperties = { width: rc.def.width, minWidth: rc.def.minWidth };

  const content = (
    <div className={cx('group/th flex items-center gap-1', justifyClass[rc.align])}>
      {draggable && rc.reorderable && dnd ? (
        <dnd.ColumnHandle label={`جابجایی ستون ${rc.label}`} />
      ) : null}

      {rc.sortable ? (
        <button
          type="button"
          onClick={(e) => onSort(rc.id, e.shiftKey)}
          title="برای مرتب‌سازی چند ستونی Shift را نگه دارید"
          className="-mx-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:bg-background/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>{rc.def.header}</span>
          {rc.type === 'money' && rc.def.currency ? (
            <span className="text-[10px] font-normal opacity-70">({rc.def.currency})</span>
          ) : null}
          {sort === 'asc' ? (
            <ArrowUp className="size-3.5 text-foreground" />
          ) : sort === 'desc' ? (
            <ArrowDown className="size-3.5 text-foreground" />
          ) : (
            <ChevronsUpDown className="size-3.5 opacity-40" />
          )}
          {sortIndex ? (
            <span className="text-[10px] tabular-nums text-foreground">
              {toFaDigits(sortIndex)}
            </span>
          ) : null}
        </button>
      ) : (
        <span>{rc.def.header}</span>
      )}

      {rc.filter ? (
        <ColumnFilterButton column={rc} value={filterValue} onChange={(v) => onFilter(rc.id, v)} />
      ) : null}
    </div>
  );

  const className = cx(
    d === 'compact' ? density.compact.head : density.comfortable.head,
    'whitespace-nowrap bg-muted px-3.5 text-xs font-semibold text-muted-foreground',
    alignClass[rc.align],
    sticky && 'sticky top-0 z-20',
    rc.def.headerClassName,
  );
  const ariaSort =
    sort === 'asc'
      ? 'ascending'
      : sort === 'desc'
        ? 'descending'
        : rc.sortable
          ? 'none'
          : undefined;

  if (draggable && rc.reorderable && dnd) {
    return (
      <dnd.SortableTh
        columnId={rc.id}
        scope="col"
        aria-sort={ariaSort}
        style={style}
        className={className}
      >
        {content}
      </dnd.SortableTh>
    );
  }
  return (
    <TableHead scope="col" aria-sort={ariaSort} style={style} className={className}>
      {content}
    </TableHead>
  );
}

/* ------------------------------------------------------------------ */
/* Row                                                                 */
/* ------------------------------------------------------------------ */

export interface RowViewProps<T> {
  original: T;
  rowId: string;
  /** Position in the visible page (0-based). */
  index: number;
  /** Number shown in the "ردیف" column; undefined hides the column. */
  rowNumber?: number;
  columns: ResolvedColumn<T>[];
  selectable: boolean;
  selected: boolean;
  /** Edit state, passed ONLY to the row being edited (other rows keep a stable `null`). */
  editing: EditingState | null;
  /** Some row is being edited → other rows' actions are locked. */
  locked: boolean;
  actions?: RowAction<T>[];
  hasActionsColumn: boolean;
  editOnDoubleClick: boolean;
  clickable: boolean;
  density: Density;
  dnd: DndModule | null;
  rowDnd: boolean;
  dragDisabled: boolean;
  className?: string;
  cb: RowCallbacks<T>;
  /** Virtualization hooks. */
  dataIndex?: number;
  measureRef?: (el: HTMLTableRowElement | null) => void;
}

/** Default (non-editing) cell rendering, driven by the column type. */
function renderDisplay<T>(rc: ResolvedColumn<T>, row: T, index: number): React.ReactNode {
  const { def } = rc;
  if (def.cell) return def.cell(row, index);
  const raw = getRaw(def, row);
  switch (rc.type) {
    case 'date':
      return (
        <DateCell
          value={raw}
          columnId={rc.id}
          format={def.dateFormat}
          clickable={rc.clickToFilter}
        />
      );
    case 'status':
      return (
        <StatusCell value={raw} columnId={rc.id} map={def.status} clickable={rc.clickToFilter} />
      );
    case 'money':
      return <MoneyCell value={raw} />;
    case 'number':
      return <NumberCell value={raw} />;
    default:
      if (raw === null || raw === undefined || raw === '')
        return <span className="text-muted-foreground">—</span>;
      return React.isValidElement(raw) || typeof raw !== 'object'
        ? (raw as React.ReactNode)
        : String(raw);
  }
}

function RowViewInner<T>(p: RowViewProps<T>) {
  const { original: row, rowId, index, columns, editing, cb } = p;
  const shiftRef = React.useRef(false);
  const d = p.density === 'compact' ? density.compact : density.comfortable;
  const isEditing = editing !== null;
  const editableOf = (rc: ResolvedColumn<T>) =>
    isEditing && rc.editable && !rc.editable.disabled?.(row) ? rc.editable : null;
  const firstEditableId = isEditing ? columns.find((rc) => editableOf(rc))?.id : undefined;
  const canEdit = columns.some((rc) => rc.editable && !rc.editable.disabled?.(row));

  const cellClass = cx(d.cell, 'align-middle');
  const stickyEnd = 'sticky end-0 z-10 bg-card group-hover/row:bg-muted';

  const rowProps = {
    'data-state': p.selected ? 'selected' : isEditing ? 'editing' : undefined,
    'data-index': p.dataIndex,
    'aria-selected': p.selectable ? p.selected : undefined,
    className: cx(
      'group/row border-b border-border/70 transition-colors last:border-0 hover:bg-muted/50',
      p.selected && 'bg-accent/60 hover:bg-accent/70',
      isEditing && 'bg-accent/30 outline outline-1 -outline-offset-1 outline-primary/40',
      (p.clickable || p.editOnDoubleClick) && !isEditing && 'cursor-pointer',
      p.className,
    ),
    onClick: p.clickable
      ? (e: React.MouseEvent) => {
          if (!(e.target as HTMLElement).closest(INTERACTIVE)) cb.rowClick(row);
        }
      : undefined,
    onDoubleClick:
      p.editOnDoubleClick && canEdit && !p.locked
        ? (e: React.MouseEvent) => {
            if (!(e.target as HTMLElement).closest(INTERACTIVE)) cb.startEdit(row, rowId);
          }
        : undefined,
    onKeyDown: isEditing
      ? (e: React.KeyboardEvent) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            cb.cancel();
          }
        }
      : undefined,
  };

  const cells = (
    <>
      {p.rowDnd ? (
        <TableCell className={cx(cellClass, 'w-10 !px-1.5')}>
          {p.dnd ? (
            <p.dnd.RowHandle
              label={`جابجایی ردیف ${toFaDigits(index + 1)}`}
              disabled={p.dragDisabled || isEditing}
            />
          ) : (
            <span className="inline-block size-7" />
          )}
        </TableCell>
      ) : null}

      {p.selectable ? (
        <TableCell className={cx(cellClass, 'w-10 !pe-0')}>
          <Checkbox
            checked={p.selected}
            aria-label={`انتخاب ردیف ${toFaDigits(index + 1)}`}
            onClick={(e: React.MouseEvent) => {
              shiftRef.current = e.shiftKey;
            }}
            onCheckedChange={(v: boolean | 'indeterminate') =>
              cb.select(rowId, v === true, shiftRef.current)
            }
          />
        </TableCell>
      ) : null}

      {p.rowNumber !== undefined ? (
        <TableCell className={cx(cellClass, 'w-12 text-muted-foreground tabular-nums')}>
          {toFaDigits(p.rowNumber)}
        </TableCell>
      ) : null}

      {columns.map((rc) => {
        const ed = editableOf(rc);
        return (
          <TableCell
            key={rc.id}
            style={{ width: rc.def.width, minWidth: rc.def.minWidth }}
            className={cx(cellClass, alignClass[rc.align], 'whitespace-nowrap', rc.def.className)}
          >
            {ed && editing && rc.def.key ? (
              <EditableCell
                type={ed.type}
                value={editing.draft[rc.def.key]}
                options={ed.options}
                placeholder={ed.placeholder}
                error={editing.errors[rc.id]}
                disabled={editing.saving}
                autoFocus={rc.id === firstEditableId}
                ariaLabel={rc.label}
                onChange={(v) => cb.setDraft(rc.def.key as string, rc.id, v)}
                onEnter={cb.save}
              />
            ) : (
              renderDisplay(rc, row, index)
            )}
          </TableCell>
        );
      })}

      {p.hasActionsColumn ? (
        <TableCell className={cx(cellClass, 'w-px', stickyEnd)}>
          <RowActions
            row={row}
            actions={p.actions ?? []}
            locked={p.locked}
            onRun={(a, r) => cb.runAction(a, r, rowId)}
            editing={
              isEditing
                ? { saving: editing!.saving, onSave: cb.save, onCancel: cb.cancel }
                : undefined
            }
          />
        </TableCell>
      ) : null}
    </>
  );

  const colSpan =
    columns.length +
    (p.rowDnd ? 1 : 0) +
    (p.selectable ? 1 : 0) +
    (p.rowNumber !== undefined ? 1 : 0) +
    (p.hasActionsColumn ? 1 : 0);

  return (
    <>
      {p.dnd && p.rowDnd ? (
        <p.dnd.SortableRow
          rowId={rowId}
          dragDisabled={p.dragDisabled || isEditing}
          ref={p.measureRef}
          {...rowProps}
        >
          {cells}
        </p.dnd.SortableRow>
      ) : (
        <TableRow ref={p.measureRef} {...rowProps}>
          {cells}
        </TableRow>
      )}
      {editing?.error ? (
        <TableRow className="border-b border-border/70 bg-destructive/5 hover:bg-destructive/5">
          <TableCell colSpan={colSpan} className="px-3.5 py-2">
            <p role="alert" className="text-sm text-destructive">
              {editing.error}
            </p>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

/**
 * Rows are memoized: typing in an edit field, selecting another row or opening a menu
 * re-renders only the rows whose own props changed.
 */
export const RowView = React.memo(RowViewInner) as typeof RowViewInner;
