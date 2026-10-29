/** Default page when the `page` URL parameter is missing or invalid. */
export const DEFAULT_PAGE = 1;

/** Default limit when the `limit` URL parameter is missing or invalid. */
export const DEFAULT_LIMIT = 20;

/** Lower bound of `limit`: clamped up on read, rejected on write. */
export const MIN_LIMIT = 1;

/** Upper bound of `limit`: clamped down on read, rejected on write. */
export const MAX_LIMIT = 100;

const DIGITS_ONLY = /^\d+$/;

export function clampLimit(value: number): number {
  return Math.min(Math.max(value, MIN_LIMIT), MAX_LIMIT);
}

/**
 * Parse a single pagination integer from a query string value.
 * Returns `fallback` when the value is missing, non-numeric, or out of range.
 */
export function parsePositiveInt(
  raw: string | null | undefined,
  fallback: number,
  min: number,
): number {
  if (raw === null || raw === undefined || raw === '') return fallback;
  if (!DIGITS_ONLY.test(raw)) return fallback;
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < min) return fallback;
  return n;
}

export interface ParsedPagination {
  page: number;
  limit: number;
}

/**
 * Pure parser for `page` / `limit` query values (no Next.js dependency).
 * - page defaults to 1, must be >= 1
 * - limit defaults to 20, clamped to 1–100
 */
export function parsePaginationParams(
  input: { page?: string | null; limit?: string | null },
  options?: { defaultLimit?: number },
): ParsedPagination {
  const defaultLimit = options?.defaultLimit ?? DEFAULT_LIMIT;
  const page = parsePositiveInt(input.page, DEFAULT_PAGE, DEFAULT_PAGE);
  const rawLimit = parsePositiveInt(input.limit, defaultLimit, MIN_LIMIT);
  const limit = clampLimit(rawLimit);
  return { page, limit };
}

/**
 * Build a query object suitable for list API calls.
 */
export function toPaginationQuery(
  page: number,
  limit: number,
): {
  page: number;
  limit: number;
} {
  return {
    page: page >= DEFAULT_PAGE ? page : DEFAULT_PAGE,
    limit: clampLimit(limit),
  };
}
