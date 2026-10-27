'use client';

import type { ReadonlyURLSearchParams } from 'next/navigation';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
  MIN_LIMIT,
} from '@repo/web/ui/utils/pagination';


export interface UsePaginationResult {
  page: number;
  limit: number;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
}

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
