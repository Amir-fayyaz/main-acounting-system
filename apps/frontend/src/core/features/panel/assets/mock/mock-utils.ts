import type { ListParams } from '../@types/common';

export function makeMoney(amount: string): string {
  return amount;
}

export function createId(prefix: string, index: number): string {
  return `${prefix}-${String(index).padStart(4, '0')}`;
}

export function filterMockRows<T>(
  rows: readonly T[],
  search: string | undefined,
  getSearchText: (row: T) => string,
): T[] {
  const normalizedSearch = search?.trim().toLocaleLowerCase('fa-IR');
  if (!normalizedSearch) return [...rows];

  return rows.filter((row) =>
    getSearchText(row).toLocaleLowerCase('fa-IR').includes(normalizedSearch),
  );
}

export function paginateMockRows<T>(
  rows: readonly T[],
  params: ListParams = {},
): { data: T[]; meta: { page: number; limit: number; total: number; totalPages: number } } {
  const page = Number.isSafeInteger(params.page) && (params.page ?? 0) > 0 ? params.page! : 1;
  const limit =
    Number.isSafeInteger(params.limit) && (params.limit ?? 0) > 0
      ? Math.min(params.limit!, 100)
      : 20;
  const total = rows.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;

  return {
    data: rows.slice(start, start + limit),
    meta: { page, limit, total, totalPages },
  };
}

export function waitForMockResponse<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), 220);
  });
}

export function formatMoney(amount: string): string {
  const integerPart = amount.split('.')[0];
  const integerValue = BigInt(integerPart || '0');
  return new Intl.NumberFormat('fa-IR').format(integerValue);
}
