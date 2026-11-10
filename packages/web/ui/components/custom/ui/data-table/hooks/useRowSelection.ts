import * as React from 'react';
import type { Row } from '@tanstack/react-table';

export interface RowSelectionOptions<T> {
  rowIds: string[];
  pageRows: Row<T>[];
  /** Changes whenever page / filters / search / sort change. */
  viewKey: string;
  onSelectionChange?: (rows: T[], ids: string[]) => void;
}

export interface RowSelection<T> {
  selection: Record<string, boolean>;
  clearSelection: () => void;
  select: (rowId: string, checked: boolean, shift: boolean) => void;
  toggleAll: (checked: boolean) => void;
  selectedIds: string[];
  selectedRows: T[];
  allSelected: boolean;
  someSelected: boolean;
}

/**
 * Selection is page-local and intentionally cleared on every view change:
 * acting on rows the user can no longer see is dangerous in accounting.
 */
export function useRowSelection<T>({
  rowIds,
  pageRows,
  viewKey,
  onSelectionChange,
}: RowSelectionOptions<T>): RowSelection<T> {
  const [selection, setSelection] = React.useState<Record<string, boolean>>({});
  const lastSelected = React.useRef<string | null>(null);

  const clearSelection = React.useCallback(() => {
    lastSelected.current = null;
    setSelection((prev) => (Object.keys(prev).length ? {} : prev));
  }, []);

  const select = React.useCallback(
    (rowId: string, checked: boolean, shift: boolean) => {
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
    },
    [rowIds],
  );

  const toggleAll = React.useCallback(
    (checked: boolean) => {
      setSelection(checked ? Object.fromEntries(rowIds.map((id) => [id, true])) : {});
      lastSelected.current = null;
    },
    [rowIds],
  );

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

  React.useEffect(() => {
    onSelectionChange?.(selectedRows, selectedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds.join('|')]);

  React.useEffect(() => {
    clearSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey]);

  return {
    selection,
    clearSelection,
    select,
    toggleAll,
    selectedIds,
    selectedRows,
    allSelected,
    someSelected,
  };
}
