'use client';

import * as React from 'react';

import type { ResolvedColumn } from '../columns/resolve-columns';
import { cx } from '../lib/text';
import { TableCell, TableFooter, TableRow } from '../ui';
import { alignClass } from './styles';

export interface TableFooterRowProps<T> {
  visibleColumns: ResolvedColumn<T>[];
  leading: number;
  summaryLabel: React.ReactNode;
  summary?: Record<string, React.ReactNode>;
  pageData: T[];
  hasActionsColumn: boolean;
}

export function TableFooterRow<T>({
  visibleColumns,
  leading,
  summaryLabel,
  summary,
  pageData,
  hasActionsColumn,
}: TableFooterRowProps<T>) {
  return (
    <TableFooter className="sticky bottom-0 z-10 border-t border-border bg-muted font-semibold">
      <TableRow className="hover:bg-transparent">
        {leading > 0 ? (
          <TableCell colSpan={leading} className="px-3.5 py-2.5">
            {summaryLabel}
          </TableCell>
        ) : null}
        {visibleColumns.map((rc, i) => {
          const content = summary?.[rc.id] ?? rc.def.footer?.(pageData);
          return (
            <TableCell key={rc.id} className={cx('px-3.5 py-2.5', alignClass[rc.align])}>
              {content ?? (i === 0 && leading === 0 ? summaryLabel : null)}
            </TableCell>
          );
        })}
        {hasActionsColumn ? <TableCell className="sticky end-0 bg-muted" /> : null}
      </TableRow>
    </TableFooter>
  );
}
