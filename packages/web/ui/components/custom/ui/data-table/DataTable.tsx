
'use client';

import * as React from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/web/ui/components/shadcn/ui/table/table';

import { PaginationControls } from './PaginationControls';
import type { DataTableProps } from './data-table.types';

export const DEFAULT_LOADING_MESSAGE = 'در حال بارگذاری…';
export const DEFAULT_EMPTY_MESSAGE = 'موردی یافت نشد';
export const DEFAULT_SEARCH_EMPTY_MESSAGE = 'برای این جستجو نتیجه‌ای یافت نشد';

function hasContent(value: React.ReactNode): boolean {
  return value !== undefined && value !== null && value !== false && value !== '';
}

function readCellValue<T>(row: T, key: string): React.ReactNode {
  const value = (row as Record<string, unknown>)[key];

  if (value === null || value === undefined) {
    return null;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    React.isValidElement(value)
  ) {
    return value;
  }

  return String(value);
}

interface StateRowProps {
  state: string;
  colSpan: number;
  children: React.ReactNode;
  role?: string;
}

function StateRow({ state, colSpan, children, role }: StateRowProps) {
  return (
    <TableRow data-state={state}>
      <TableCell colSpan={colSpan} className="whitespace-normal text-center">
        {role ? <div role={role}>{children}</div> : children}
      </TableCell>
    </TableRow>
  );
}

export function DataTable<T>({
  columns,
  rows,
  rowKey = (_row, index) => index,
  error,
  loading = false,
  searchTerm,
  loadingMessage = DEFAULT_LOADING_MESSAGE,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  searchEmptyMessage = DEFAULT_SEARCH_EMPTY_MESSAGE,
  className,
  'aria-label': ariaLabel,
  meta,
  pageSizes,
}: DataTableProps<T>) {
  const isError = hasContent(error);
  const isLoading = !isError && loading;
  const isEmpty = !isError && !isLoading && rows.length === 0;
  const hasSearchTerm = (searchTerm?.trim().length ?? 0) > 0;
  const colSpan = columns.length;

  let body: React.ReactNode;

  if (isError) {
    body = (
      <StateRow state="error" colSpan={colSpan} role="alert">
        {error}
      </StateRow>
    );
  } else if (isLoading) {
    body = (
      <StateRow state="loading" colSpan={colSpan} role="status">
        {loadingMessage}
      </StateRow>
    );
  } else if (isEmpty) {
    body = (
      <StateRow
        state={hasSearchTerm ? 'empty-search' : 'empty'}
        colSpan={colSpan}
      >
        {hasSearchTerm ? searchEmptyMessage : emptyMessage}
      </StateRow>
    );
  } else {
    body = rows.map((row, rowIndex) => (
      <TableRow key={rowKey(row, rowIndex)}>
        {columns.map((column, columnIndex) => (
          <TableCell
            key={column.key ?? `column-${columnIndex}`}
            className={column.className}
          >
            {column.cell
              ? column.cell(row, rowIndex)
              : readCellValue(row, column.key ?? '')}
          </TableCell>
        ))}
      </TableRow>
    ));
  }

  const table = (
    <Table
      className={className}
      aria-label={ariaLabel}
      aria-busy={isLoading || undefined}
    >
      <TableHeader>
        <TableRow>
          {columns.map((column, index) => (
            <TableHead
              key={column.key ?? `column-${index}`}
              className={column.headerClassName}
            >
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>

      <TableBody>{body}</TableBody>
    </Table>
  );

  if (!meta) {
    return table;
  }

  return (
    <>
      {table}
      <PaginationControls meta={meta} pageSizes={pageSizes} />
    </>
  );
}

export default DataTable;
