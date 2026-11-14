import * as React from 'react';

import { resolveReason, type ActionDialogState } from '../actions/ActionDialog';
import { toFaDigits } from '../date/jalali';
import type { BulkAction, RowAction } from '../data-table.types';

export interface TableActionsOptions<T> {
  selectedRows: T[];
  clearSelection: () => void;
  startEdit: (row: T, rowId: string) => void;
  openDialog: (state: Omit<ActionDialogState, 'key'>) => void;
  reportError: (error: unknown, fallback: string) => void;
}

export interface TableActionsApi<T> {
  runAction: (action: RowAction<T>, row: T, rowId: string) => void;
  runBulk: (action: BulkAction<T>) => void;
}

/**
 * Row/bulk action execution: direct calls stay direct, anything with a
 * confirmation or audit reason goes through the shared action dialog.
 */
export function useTableActions<T>({
  selectedRows,
  clearSelection,
  startEdit,
  openDialog,
  reportError,
}: TableActionsOptions<T>): TableActionsApi<T> {
  const runAction = React.useCallback(
    (action: RowAction<T>, row: T, rowId: string) => {
      if (action.kind === 'edit') {
        startEdit(row, rowId);
        return;
      }
      const reason = resolveReason(action.reason);
      if (!action.confirm && !reason) {
        Promise.resolve(action.onSelect?.(row, {})).catch((err) =>
          reportError(err, `«${action.label}» انجام نشد.`),
        );
        return;
      }
      const desc = action.confirm?.description;
      openDialog({
        title: action.confirm?.title ?? action.label,
        description: typeof desc === 'function' ? desc(row) : desc,
        confirmLabel: action.confirm?.confirmLabel ?? action.label,
        destructive: action.variant === 'destructive',
        reason,
        onConfirm: (r) => action.onSelect?.(row, { reason: r }),
      });
    },
    [openDialog, reportError, startEdit],
  );

  const runBulk = React.useCallback(
    (action: BulkAction<T>) => {
      const reason = resolveReason(action.reason);
      const rowsNow = selectedRows;
      if (!action.confirm && !reason) {
        Promise.resolve(action.onSelect(rowsNow, {})).then(clearSelection, (err) =>
          reportError(err, `«${action.label}» انجام نشد.`),
        );
        return;
      }
      const desc = action.confirm?.description;
      openDialog({
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
    },
    [selectedRows, clearSelection, openDialog, reportError],
  );

  return { runAction, runBulk };
}
