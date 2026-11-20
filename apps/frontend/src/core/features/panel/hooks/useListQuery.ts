'use client';

import { useSearchParams } from 'next/navigation';

import { usePagination } from '@repo/web';

import { useStatusFilter } from './useStatusFilter';

/** Page size used by panel lists when the URL does not specify `limit`. */
export const PANEL_DEFAULT_LIMIT = 10;

/** Selectable page sizes offered by panel list tables (prototype contract). */
export const PANEL_PAGE_SIZES: number[] = [10, 20, 50];

/**
 * URL-synced list state for panel pages: search + status filter + pagination.
 *
 * The URL stays the single source of truth (`search`, `status`, `page`,
 * `limit`). `limit` defaults to 10 for panel lists, and search/status changes
 * reset `page` to the first page while preserving unrelated parameters.
 */
export function useListQuery() {
  const { page, limit, setPage, setLimit, resetPage, queryParams } = usePagination({
    defaultLimit: PANEL_DEFAULT_LIMIT,
  });
  const { status, setStatus } = useStatusFilter();
  const searchParams = useSearchParams();
  const search = searchParams.get('search') ?? '';

  return {
    page,
    limit,
    setPage,
    setLimit,
    resetPage,
    queryParams,
    status,
    setStatus,
    search,
  };
}
