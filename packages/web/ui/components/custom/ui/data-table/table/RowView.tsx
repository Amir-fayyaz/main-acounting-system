'use client';

import * as React from 'react';

import { RowActions } from '../actions/RowActions';
import { DateCell, MoneyCell, NumberCell, StatusCell } from '../cells/cells';
import { getRaw, type ResolvedColumn } from '../columns/resolve-columns';
import type { Density, EditingState, RowAction, RowCallbacks } from '../data-table.types';
import { toFaDigits } from '../date/jalali';
import { EditableCell } from '../editing/EditableCell';
import type { DndModule } from '../hooks/useDndModule';
import { cx } from '../lib/text';
import { Checkbox, TableCell, TableRow } from '../ui';
import { alignClass, density, INTERACTIVE } from './styles';

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
