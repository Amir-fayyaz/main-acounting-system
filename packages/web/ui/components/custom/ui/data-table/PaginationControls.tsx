'use client';

import * as React from 'react';

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@repo/web/ui/components/shadcn/ui/pagination/pagination';
import { usePagination } from '@repo/web/hooks/usePagination';

import type { PaginationMeta } from './data-table.types';
import { resolvePageSizes, sanitizeMeta } from './data-table.utils';

interface PaginationControlsProps {
  meta: PaginationMeta;
  pageSizes?: number[];
}

export function PaginationControls({
  meta,
  pageSizes,
}: PaginationControlsProps) {
  const { setPage, setLimit } = usePagination();
  const selectId = React.useId();

  const { page, limit, total, totalPages } = sanitizeMeta(meta);
  const sizes = resolvePageSizes(pageSizes, limit);
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  function navigate(
    event: React.MouseEvent<HTMLAnchorElement>,
    target: number,
    enabled: boolean,
  ) {
    event.preventDefault();

    if (enabled) {
      setPage(target);
    }
  }

  return (
    <div
      data-slot="data-table-pagination"
      dir="rtl"
      className="flex flex-col gap-4 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between px-16"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <label htmlFor={selectId} className="shrink-0">
          نمایش
        </label>

        <select
          id={selectId}
          data-slot="data-table-page-size"
          value={limit}
          onChange={(event) => setLimit(Number(event.target.value))}
          className="h-9 min-w-16 cursor-pointer rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        >
          {sizes.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>

        <span className="shrink-0">مورد در هر صفحه</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 sm:justify-end">
        <div
          data-slot="data-table-pagination-summary"
          className="text-sm text-muted-foreground"
        >
          صفحه{' '}
          <span className="font-semibold tabular-nums text-foreground">
            {page}
          </span>
          {' '}از{' '}
          <span className="font-medium tabular-nums text-foreground">
            {totalPages}
          </span>
          <span className="mx-2 text-border">|</span>
          <span data-slot="data-table-pagination-total">
            {total.toLocaleString('fa-IR')} مورد
          </span>
        </div>

        <Pagination data-slot="data-table-pagination-nav" className="mx-0 w-auto">
          <PaginationContent className="gap-1">
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={!canGoPrevious}
                tabIndex={canGoPrevious ? 0 : -1}
                onClick={(event) =>
                  navigate(event, page - 1, canGoPrevious)
                }
                className="h-9 gap-1 rounded-lg border border-border bg-background px-3 transition-colors hover:bg-accent hover:text-accent-foreground aria-disabled:pointer-events-none aria-disabled:opacity-40"
              />
            </PaginationItem>

            <PaginationItem>
              <span
                aria-current="page"
                className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold tabular-nums text-primary-foreground"
              >
                {page.toLocaleString('fa-IR')}
              </span>
            </PaginationItem>

            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={!canGoNext}
                tabIndex={canGoNext ? 0 : -1}
                onClick={(event) =>
                  navigate(event, page + 1, canGoNext)
                }
                className="h-9 gap-1 rounded-lg border border-border bg-background px-3 transition-colors hover:bg-accent hover:text-accent-foreground aria-disabled:pointer-events-none aria-disabled:opacity-40"
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}