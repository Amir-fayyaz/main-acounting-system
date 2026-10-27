'use client';

import type { ReadonlyURLSearchParams } from 'next/navigation';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/** Default page when the `page` URL parameter is missing or invalid. */
export const DEFAULT_PAGE = 1;
/** Default limit when the `limit` URL parameter is missing or invalid. */
export const DEFAULT_LIMIT = 20;
/** Lower bound of `limit`: clamped up on read, rejected on write. */
export const MIN_LIMIT = 1;
/** Upper bound of `limit`: clamped down on read, rejected on write. */
export const MAX_LIMIT = 100;

export interface UsePaginationResult {
  /** Current 1-based page, read from the `page` URL parameter. */
  page: number;
  /** Items per page, read from the `limit` URL parameter (clamped to 1–100). */
  limit: number;
  /** Replaces the `page` parameter. No-op when invalid or already current. */
  setPage: (page: number) => void;
  /** Replaces the `limit` parameter and resets `page` to 1. No-op when invalid or already current. */
  setLimit: (limit: number) => void;
}

/** Backward-compatible alias of {@link UsePaginationResult}. */
export type UsePaginationReturn = UsePaginationResult;

const PAGE_PATTERN = /^\d+$/;

function clampLimit(value: number): number {
  return Math.min(Math.max(value, MIN_LIMIT), MAX_LIMIT);
}

function parsePaginationParams(searchParams: ReadonlyURLSearchParams | URLSearchParams): {
  page: number;
  limit: number;
} {
  const rawPage = searchParams.get('page');
  const parsedPage = rawPage !== null && PAGE_PATTERN.test(rawPage) ? Number(rawPage) : Number.NaN;
  const page =
    Number.isSafeInteger(parsedPage) && parsedPage >= DEFAULT_PAGE ? parsedPage : DEFAULT_PAGE;

  const rawLimit = searchParams.get('limit');
  const parsedLimit =
    rawLimit !== null && PAGE_PATTERN.test(rawLimit) ? Number(rawLimit) : Number.NaN;
  const limit = Number.isNaN(parsedLimit) ? DEFAULT_LIMIT : clampLimit(parsedLimit);

  return { page, limit };
}

/**
 * URL-synchronized pagination state for the backend list contract
 * (`?page=` 1-based, default 1; `?limit=` default 20, range 1–100 — ADR-013 §10).
 *
 * Invalid or missing URL values fall back to safe defaults; numeric limits
 * outside 1–100 are clamped into range. Unrelated query parameters are always
 * preserved, and navigation is skipped when the resulting URL is unchanged.
 * Actions ignore invalid arguments instead of writing them to the URL.
 */
export function usePagination(): UsePaginationResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { page, limit } = parsePaginationParams(searchParams);

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      params.set(key, value);
    }

    const nextQuery = params.toString();
    if (nextQuery === searchParams.toString()) return;

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }

  function setPage(nextPage: number) {
    if (!Number.isSafeInteger(nextPage) || nextPage < DEFAULT_PAGE) return;
    updateParams({ page: String(nextPage) });
  }

  function setLimit(nextLimit: number) {
    if (!Number.isInteger(nextLimit) || nextLimit < MIN_LIMIT || nextLimit > MAX_LIMIT) return;
    if (nextLimit === limit) return;
    updateParams({ limit: String(nextLimit), page: String(DEFAULT_PAGE) });
  }

  return { page, limit, setPage, setLimit };
}
