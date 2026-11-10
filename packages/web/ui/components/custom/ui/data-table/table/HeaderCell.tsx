'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

import type { ResolvedColumn } from '../columns/resolve-columns';
import type { Density } from '../data-table.types';
import { toFaDigits } from '../date/jalali';
import { ColumnFilterButton } from '../filters/ColumnFilter';
import type { FilterValue } from '../filters/filter-types';
import type { DndModule } from '../hooks/useDndModule';
import { cx } from '../lib/text';
import { TableHead } from '../ui';
import { alignClass, density, justifyClass } from './styles';

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
