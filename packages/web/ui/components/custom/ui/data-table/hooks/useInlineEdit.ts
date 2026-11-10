import * as React from 'react';
import type { Row } from '@tanstack/react-table';

import { resolveReason, type ActionDialogState } from '../actions/ActionDialog';
import { getRaw, type ResolvedColumn } from '../columns/resolve-columns';
import type { DataTableProps } from '../data-table.types';

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

export interface InlineEditOptions<T> {
  resolved: ResolvedColumn<T>[];
  pageRows: Row<T>[];
  onRowSave?: DataTableProps<T>['onRowSave'];
  editReason?: DataTableProps<T>['editReason'];
  openDialog: (state: Omit<ActionDialogState, 'key'>) => void;
}

export interface InlineEditApi<T> {
  editing: EditingState | null;
  startEdit: (row: T, rowId: string) => void;
  cancelEdit: () => void;
  setDraft: (key: string, columnId: string, value: unknown) => void;
  saveEdit: () => void;
}

const sameValue = (a: unknown, b: unknown) =>
  a === b ||
  ((a === null || a === undefined || a === '') && (b === null || b === undefined || b === ''));

/**
 * Inline row editing: draft/error state, validation, patch computation, and
 * persistence through `onRowSave` (optionally behind a reason dialog).
 */
export function useInlineEdit<T>({
  resolved,
  pageRows,
  onRowSave,
  editReason,
  openDialog,
}: InlineEditOptions<T>): InlineEditApi<T> {
  const [editing, setEditing] = React.useState<EditingState | null>(null);

  const startEdit = React.useCallback(
    (row: T, rowId: string) => {
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
    },
    [onRowSave, resolved],
  );

  const cancelEdit = React.useCallback(() => setEditing((cur) => (cur?.saving ? cur : null)), []);

  const setDraft = React.useCallback((key: string, columnId: string, value: unknown) => {
    setEditing((cur) => {
      if (!cur) return cur;
      const errors = { ...cur.errors };
      delete errors[columnId];
      return { ...cur, draft: { ...cur.draft, [key]: value }, errors, error: undefined };
    });
  }, []);

  const saveEdit = React.useCallback(() => {
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
      openDialog({
        title: 'ثبت ویرایش',
        description: 'دلیل این ویرایش در تاریخچه‌ی تغییرات ثبت می‌شود.',
        confirmLabel: 'ذخیره',
        reason: { label: 'دلیل ویرایش', ...reason },
        onConfirm: (r) => persist(r, true),
      });
    } else {
      void persist(undefined, false);
    }
  }, [editing, onRowSave, pageRows, resolved, editReason, openDialog]);

  return { editing, startEdit, cancelEdit, setDraft, saveEdit };
}
