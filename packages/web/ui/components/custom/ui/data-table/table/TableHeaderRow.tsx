'use client';

import * as React from 'react';

import type { ResolvedColumn } from '../columns/resolve-columns';
import type { Density } from '../data-table.types';
import type { FilterValue } from '../filters/filter-types';
import type { DndModule } from '../hooks/useDndModule';
import type { SortItem } from '../lib/url-state';
import { cx } from '../lib/text';
import { Checkbox, TableRow } from '../ui';
import { HeaderCell } from './HeaderCell';

export interface TableHeaderRowProps<T> {
  visibleColumns: ResolvedColumn<T>[];
  sorting: SortItem[];
  filters: Record<string, FilterValue>;
  onSort: (columnId: string, multi: boolean) => void;
  onFilter: (columnId: string, value: FilterValue | undefined) => void;
  density: Density;
  stickyHeader: boolean;
  dnd: DndModule | null;
  columnDnd: boolean;
  reorderableIds: string[];
  rowDndWanted: boolean;
  selectable: boolean;
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: (checked: boolean) => void;
  pageRowCount: number;
  rowNumbers: boolean;
  hasActionsColumn: boolean;
}

export function TableHeaderRow<T>({
  visibleColumns,
  sorting,
  filters,
  onSort,
  onFilter,
  density,
  stickyHeader,
  dnd,
  columnDnd,
  reorderableIds,
  rowDndWanted,
  selectable,
  allSelected,
  someSelected,
  onToggleAll,
  pageRowCount,
  rowNumbers,
  hasActionsColumn,
}: TableHeaderRowProps<T>) {
  const sortOf = (id: string) => {
    const i = sorting.findIndex((s) => s.id === id);
    return i < 0
      ? { dir: false as const, index: undefined }
      : {
          dir: sorting[i].desc ? ('desc' as const) : ('asc' as const),
          index: sorting.length > 1 ? i + 1 : undefined,
        };
  };

  const headStick = cx(
    'whitespace-nowrap bg-muted text-xs font-semibold text-muted-foreground',
    stickyHeader && 'sticky top-0 z-20',
  );

  const headerCells = visibleColumns.map((rc) => {
    const s = sortOf(rc.id);
    return (
      <HeaderCell
        key={rc.id}
        column={rc}
        sort={s.dir}
        sortIndex={s.index}
        onSort={onSort}
        filterValue={filters[rc.id]}
        onFilter={onFilter}
        density={density}
        sticky={stickyHeader}
        dnd={dnd}
        columnDnd={columnDnd}
      />
    );
  });

  return (
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
            disabled={pageRowCount === 0}
            onCheckedChange={(v: boolean | 'indeterminate') => onToggleAll(v === true)}
          />
        </th>
      ) : null}
      {rowNumbers ? (
        <th scope="col" className={cx(headStick, 'w-12 px-3.5 text-start')}>
          ردیف
        </th>
      ) : null}
      {dnd && columnDnd ? (
        <dnd.ColumnsContext ids={reorderableIds}>{headerCells}</dnd.ColumnsContext>
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
}
