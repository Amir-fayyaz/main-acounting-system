import type { PaginationMeta } from '../data-table.types';

export interface PaginationResolveInput {
  isServer: boolean;
  meta?: PaginationMeta;
  paginate: boolean;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  serverPage?: number;
  serverLimit?: number;
  onServerPageChange?: (page: number) => void;
  onServerLimitChange?: (limit: number) => void;
}

/**
 * Pagination is only rendered when it is fully wired: server mode needs `meta`
 * plus controlled page/limit handlers; client mode needs a non-empty page set.
 */
export function resolvePaginationMeta({
  isServer,
  meta,
  paginate,
  total,
  page,
  limit,
  totalPages,
  serverPage,
  serverLimit,
  onServerPageChange,
  onServerLimitChange,
}: PaginationResolveInput): PaginationMeta | null {
  if (isServer) {
    const ok =
      Boolean(meta) &&
      serverPage !== undefined &&
      serverLimit !== undefined &&
      typeof onServerPageChange === 'function' &&
      typeof onServerLimitChange === 'function';
    return ok ? meta! : null;
  }
  if (!paginate || total === 0) return null;
  return { page, limit, total, totalPages };
}
