
import type { PaginationMeta } from './data-table.types';

import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
  MIN_LIMIT,
} from '@repo/web/ui/utils/pagination';

export const DEFAULT_PAGE_SIZES = [10, 20, 50, 100] as const;

/** Keeps a server-reported counter usable when the payload carries junk. */
function sanitizeInt(value: number, min: number, fallback: number): number {
  return Number.isSafeInteger(value) && value >= min ? value : fallback;
}

export function sanitizeMeta(meta: PaginationMeta): Required<PaginationMeta> {
  const limit = sanitizeInt(meta.limit, MIN_LIMIT, DEFAULT_LIMIT);

  return {
    page: sanitizeInt(meta.page, DEFAULT_PAGE, DEFAULT_PAGE),
    limit: Math.min(Math.max(limit, MIN_LIMIT), MAX_LIMIT),
    total: sanitizeInt(meta.total, 0, 0),
    totalPages: sanitizeInt(meta.totalPages, 1, 1),
  };
}

/** Merges the current limit into the valid page sizes, sorted ascending. */
export function resolvePageSizes(
  pageSizes: number[] | undefined,
  current: number,
): number[] {
  const requested = pageSizes ?? DEFAULT_PAGE_SIZES;
  const valid = requested.filter(
    (size) =>
      Number.isSafeInteger(size) &&
      size >= MIN_LIMIT &&
      size <= MAX_LIMIT,
  );

  const sizes = valid.length > 0 ? valid : [...DEFAULT_PAGE_SIZES];
  const merged = sizes.includes(current) ? sizes : [...sizes, current];

  return [...merged].sort((left, right) => left - right);
}
