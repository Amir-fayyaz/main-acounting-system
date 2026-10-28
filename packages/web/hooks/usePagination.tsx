'use client';

import type { ReadonlyURLSearchParams } from 'next/navigation';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
  MIN_LIMIT,
} from '@repo/web/ui/utils/pagination';

export interface UsePaginationOptions {
  /** URL query key for the page number. Defaults to `"page"`. */
  pageParam?: string;
  /** URL query key for the page size. Defaults to `"limit"`. */
  limitParam?: string;
  /** Fallback page size when the URL value is missing or invalid. Defaults to `20`. */
  defaultLimit?: number;
}

export interface UsePaginationReturn {
  page: number;
  limit: number;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  /** Explicitly reset the page to 1 without touching other params. */
  resetPage: () => void;
  /** Ready-to-send object for API query strings. */
  queryParams: {
    page: number;
    limit: number;
  };
}

const DIGITS_ONLY = /^\d+$/;

function clampLimit(value: number): number {
  return Math.min(Math.max(value, MIN_LIMIT), MAX_LIMIT);
}

function parsePaginationParams(
  searchParams: ReadonlyURLSearchParams | URLSearchParams,
  pageParam: string,
  limitParam: string,
  defaultLimit: number,
): { page: number; limit: number } {
  const rawPage = searchParams.get(pageParam);
  const parsedPage =
    rawPage !== null && DIGITS_ONLY.test(rawPage) ? Number(rawPage) : Number.NaN;
  const page =
    Number.isSafeInteger(parsedPage) && parsedPage >= DEFAULT_PAGE
      ? parsedPage
      : DEFAULT_PAGE;

  const rawLimit = searchParams.get(limitParam);
  const parsedLimit =
    rawLimit !== null && DIGITS_ONLY.test(rawLimit) ? Number(rawLimit) : Number.NaN;
  const limit = Number.isNaN(parsedLimit)
    ? defaultLimit
    : clampLimit(parsedLimit);

  return { page, limit };
}

/**
 * URL-synced pagination state for list endpoints.
 *
 * - Reads `page` (1-based) and `limit` from the current URL
 * - Defaults: page=1, limit=20
 * - Clamps limit to 1–100
 * - Changing limit always resets page to 1
 * - Preserves unrelated query parameters
 */
export function usePagination(
  options: UsePaginationOptions = {},
): UsePaginationReturn {
  const {
    pageParam = 'page',
    limitParam = 'limit',
    defaultLimit = DEFAULT_LIMIT,
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { page, limit } = parsePaginationParams(
    searchParams,
    pageParam,
    limitParam,
    defaultLimit,
  );

  const replaceParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        params.set(key, value);
      }

      const nextQuery = params.toString();
      if (nextQuery === searchParams.toString()) return;

      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const setPage = useCallback(
    (nextPage: number) => {
      if (!Number.isSafeInteger(nextPage) || nextPage < DEFAULT_PAGE) return;
      if (nextPage === page) return;
      replaceParams({ [pageParam]: String(nextPage) });
    },
    [page, pageParam, replaceParams],
  );

  const setLimit = useCallback(
    (nextLimit: number) => {
      if (
        !Number.isInteger(nextLimit) ||
        nextLimit < MIN_LIMIT ||
        nextLimit > MAX_LIMIT
      ) {
        return;
      }
      if (nextLimit === limit && page === DEFAULT_PAGE) return;
      // Changing page size always restarts at page 1.
      replaceParams({
        [limitParam]: String(nextLimit),
        [pageParam]: String(DEFAULT_PAGE),
      });
    },
    [limit, limitParam, page, pageParam, replaceParams],
  );

  const resetPage = useCallback(() => {
    setPage(DEFAULT_PAGE);
  }, [setPage]);

  const queryParams = useMemo(
    () => ({ page, limit }),
    [page, limit],
  );

  return {
    page,
    limit,
    setPage,
    setLimit,
    resetPage,
    queryParams,
  };
}

export type UsePaginationResult = UsePaginationReturn;
