import * as React from 'react';
import type { Table } from '@tanstack/react-table';

import type { ResolvedColumn } from '../columns/resolve-columns';
import type { RowReorderEvent } from '../data-table.types';
import type { DndModule } from './useDndModule';

export interface TableReorderOptions<T> {
  dndMod: DndModule | null;
  rowIds: string[];
  pageData: T[];
  byId: Record<string, ResolvedColumn<T>>;
  table: Table<T>;
  onRowReorder?: (event: RowReorderEvent<T>) => void;
  setColumnOrder: (order: string[]) => void;
}

export interface TableReorderApi<T> {
  onRowsReorder: (activeId: string, overId: string) => void;
  onColumnsReorder: (activeId: string, overId: string) => void;
}

/** Translates dnd-kit active/over ids into the public reorder callbacks. */
export function useTableReorder<T>({
  dndMod,
  rowIds,
  pageData,
  byId,
  table,
  onRowReorder,
  setColumnOrder,
}: TableReorderOptions<T>): TableReorderApi<T> {
  const onRowsReorder = React.useCallback(
    (activeId: string, overId: string) => {
      if (!dndMod || !onRowReorder) return;
      const oldIndex = rowIds.indexOf(activeId);
      const newIndex = rowIds.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0) return;
      onRowReorder({
        activeId,
        overId,
        oldIndex,
        newIndex,
        rows: dndMod.arrayMove(pageData, oldIndex, newIndex),
      });
    },
    [dndMod, onRowReorder, rowIds, pageData],
  );

  const onColumnsReorder = React.useCallback(
    (activeId: string, overId: string) => {
      if (!dndMod || !byId[overId]?.reorderable) return;
      const all = table.getAllLeafColumns().map((c) => c.id);
      const from = all.indexOf(activeId);
      const to = all.indexOf(overId);
      if (from < 0 || to < 0) return;
      setColumnOrder(dndMod.arrayMove(all, from, to));
    },
    [dndMod, byId, table, setColumnOrder],
  );

  return { onRowsReorder, onColumnsReorder };
}
