import * as React from 'react';

import type { DataTableContextValue } from '../context';
import type { RowAction, RowCallbacks } from '../data-table.types';
import type { FilterValue } from '../filters/filter-types';

export interface RowCallbacksOptions<T> {
  select: (rowId: string, checked: boolean, shift: boolean) => void;
  startEdit: (row: T, rowId: string) => void;
  setDraft: (key: string, columnId: string, value: unknown) => void;
  save: () => void;
  cancel: () => void;
  runAction: (action: RowAction<T>, row: T, rowId: string) => void;
  onRowClick?: (row: T) => void;
  setColumnFilter: (columnId: string, value: FilterValue | undefined) => void;
}

export interface RowCallbacksApi<T> {
  cb: RowCallbacks<T>;
  ctx: DataTableContextValue;
}

/**
 * Keeps row callbacks and the table context stable across renders so memoized
 * rows do not re-render when an unrelated handler trait changes.
 */
export function useRowCallbacks<T>({
  select,
  startEdit,
  setDraft,
  save,
  cancel,
  runAction,
  onRowClick,
  setColumnFilter,
}: RowCallbacksOptions<T>): RowCallbacksApi<T> {
  const live = {
    select,
    startEdit,
    setDraft,
    save,
    cancel,
    runAction,
    rowClick: (row: T) => onRowClick?.(row),
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

  return { cb, ctx };
}
