import * as React from 'react';

import type { ResolvedColumn } from '../columns/resolve-columns';
import { isFilterActive, type FilterValue } from '../filters/filter-types';
import type { SortItem } from '../lib/url-state';
import { MAX_SORT_COLUMNS } from './useClientTablePipeline';

type SetState<T> = (next: T | ((prev: T) => T)) => void;

export interface TableViewHandlersOptions<T> {
  byId: Record<string, ResolvedColumn<T>>;
  setSorting: SetState<SortItem[]>;
  setFilters: SetState<Record<string, FilterValue>>;
  setPage: SetState<number>;
  clearSelection: () => void;
}

/**
 * User gestures that change the current view. Every one resets the page and
 * clears selection so hidden rows are never acted on.
 */
export function useTableViewHandlers<T>({
  byId,
  setSorting,
  setFilters,
  setPage,
  clearSelection,
}: TableViewHandlersOptions<T>) {
  const viewChanged = React.useCallback(() => {
    setPage(1);
    clearSelection();
  }, [setPage, clearSelection]);

  const toggleSort = React.useCallback(
    (columnId: string, multi: boolean) => {
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
    },
    [byId, setSorting, viewChanged],
  );

  const setColumnFilter = React.useCallback(
    (columnId: string, value: FilterValue | undefined) => {
      setFilters((prev) => {
        const next = { ...prev };
        if (value === undefined || !isFilterActive(value)) delete next[columnId];
        else next[columnId] = value;
        return next;
      });
      viewChanged();
    },
    [setFilters, viewChanged],
  );

  return { viewChanged, toggleSort, setColumnFilter };
}
