import type { ListParams } from '../assets/@types/common';
import type { PaginatedResponse } from '@repo/web';
import { filterMockRows, paginateMockRows, waitForMockResponse } from '../assets/mock/mock-utils';

export async function listMockRows<T>(
  rows: readonly T[],
  params: ListParams,
  {
    getSearchText,
    getStatus,
  }: { getSearchText: (row: T) => string; getStatus?: (row: T) => string },
): Promise<PaginatedResponse<T>> {
  let filtered = filterMockRows(rows, params.search, getSearchText);
  const requestedStatus = params.status?.trim().toLowerCase();
  if (getStatus && requestedStatus) {
    filtered = filtered.filter((row) => getStatus(row).trim().toLowerCase() === requestedStatus);
  }
  if (params.noPage) {
    return waitForMockResponse({
      data: filtered,
      meta: {
        page: 1,
        limit: filtered.length,
        total: filtered.length,
        totalPages: filtered.length > 0 ? 1 : 0,
      },
    });
  }
  return waitForMockResponse(paginateMockRows(filtered, params));
}
