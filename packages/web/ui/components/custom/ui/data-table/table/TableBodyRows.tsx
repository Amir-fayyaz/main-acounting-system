'use client';

import * as React from 'react';
import type { ReactVirtualizer } from '@tanstack/react-virtual';

import type { DndModule } from '../hooks/useDndModule';
import { cx } from '../lib/text';
import { Button, TableBody, TableCell } from '../ui';
import { TableStateRow } from './TableStateRow';

export interface TableBodyRowsProps {
  isError: boolean;
  error: React.ReactNode;
  isLoading: boolean;
  refreshing: boolean;
  isEmpty: boolean;
  hasSearch: boolean;
  hasFilters: boolean;
  loadingMessage: React.ReactNode;
  emptyMessage: React.ReactNode;
  searchEmptyMessage: React.ReactNode;
  colSpan: number;
  onClearFilters: () => void;
  virtualize: boolean;
  virtualizer: ReactVirtualizer<HTMLDivElement, Element>;
  pageRowCount: number;
  renderRow: (index: number, virtualItem?: { index: number }) => React.ReactNode;
  dnd: DndModule | null;
  rowDndWanted: boolean;
  rowIds: string[];
}

export function TableBodyRows({
  isError,
  error,
  isLoading,
  refreshing,
  isEmpty,
  hasSearch,
  hasFilters,
  loadingMessage,
  emptyMessage,
  searchEmptyMessage,
  colSpan,
  onClearFilters,
  virtualize,
  virtualizer,
  pageRowCount,
  renderRow,
  dnd,
  rowDndWanted,
  rowIds,
}: TableBodyRowsProps) {
  let body: React.ReactNode;

  if (isError) {
    body = (
      <TableStateRow state="error" colSpan={colSpan} role="alert">
        {error}
      </TableStateRow>
    );
  } else if (isLoading && !refreshing) {
    body = (
      <TableStateRow state="loading" colSpan={colSpan} role="status">
        {loadingMessage}
      </TableStateRow>
    );
  } else if (isEmpty) {
    const filtered = hasSearch || hasFilters;
    body = (
      <TableStateRow state={filtered ? 'empty-search' : 'empty'} colSpan={colSpan}>
        <div className="grid justify-items-center gap-3">
          <span>{filtered ? searchEmptyMessage : emptyMessage}</span>
          {hasFilters ? (
            <Button type="button" size="sm" variant="outline" onClick={onClearFilters}>
              پاک کردن فیلترها
            </Button>
          ) : null}
        </div>
      </TableStateRow>
    );
  } else if (virtualize) {
    const items = virtualizer.getVirtualItems();
    const padTop = items.length ? items[0].start : 0;
    const padBottom = items.length ? virtualizer.getTotalSize() - items[items.length - 1].end : 0;
    body = (
      <>
        {padTop > 0 ? (
          <tr aria-hidden style={{ height: padTop }}>
            <td colSpan={colSpan} />
          </tr>
        ) : null}
        {items.map((v) => renderRow(v.index, v))}
        {padBottom > 0 ? (
          <tr aria-hidden style={{ height: padBottom }}>
            <td colSpan={colSpan} />
          </tr>
        ) : null}
      </>
    );
  } else {
    const rowEls = Array.from({ length: pageRowCount }, (_, i) => renderRow(i));
    body = dnd && rowDndWanted ? <dnd.RowsContext ids={rowIds}>{rowEls}</dnd.RowsContext> : rowEls;
  }

  return (
    <TableBody className={cx(refreshing && 'pointer-events-none opacity-60 transition-opacity')}>
      {body}
    </TableBody>
  );
}
