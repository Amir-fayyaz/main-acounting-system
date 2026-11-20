'use client';

import * as React from 'react';

import type { PaginationMeta } from '../data-table.types';
import { PaginationControls } from '../PaginationControls';

export interface TablePaginationProps {
  meta: PaginationMeta | null;
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizes?: number[];
  /** Client mode restarts at page 1 when the page size changes. */
  resetPageOnLimitChange?: boolean;
}

export function TablePagination({
  meta,
  page,
  limit,
  onPageChange,
  onLimitChange,
  pageSizes,
  resetPageOnLimitChange,
}: TablePaginationProps) {
  if (meta === null || page === undefined || limit === undefined) return null;
  if (!onPageChange || !onLimitChange) return null;

  return (
    <PaginationControls
      meta={meta}
      page={page}
      limit={limit}
      onPageChange={onPageChange}
      onLimitChange={(next) => {
        onLimitChange(next);
        if (resetPageOnLimitChange) onPageChange(1);
      }}
      pageSizes={pageSizes}
    />
  );
}
