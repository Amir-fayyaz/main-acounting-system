import type { PaginatedResponse } from '@repo/web';
import type { ListParams } from '../../shared/assets/@types';
import {
  filterMockRows,
  paginateMockRows,
  waitForMockResponse,
} from '../../shared/assets/mock/mock-utils';

interface MockResourceOptions<T extends { id: string }, TCreate> {
  initialData: T[];
  getSearchText: (row: T) => string;
  createEntity: (input: TCreate, id: string) => T;
  idPrefix: string;
  getStatus?: (row: T) => string;
}

export interface MockResource<T, TCreate> {
  list: (params?: ListParams) => Promise<PaginatedResponse<T>>;
  create: (input: TCreate) => Promise<T>;
}

interface ListRowsOptions<T> {
  getSearchText: (row: T) => string;
  getStatus?: (row: T) => string;
}

export async function listMockRows<T>(
  rows: readonly T[],
  params: ListParams,
  { getSearchText, getStatus }: ListRowsOptions<T>,
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

export function createMockResource<T extends { id: string }, TCreate>({
  initialData,
  getSearchText,
  createEntity,
  idPrefix,
  getStatus,
}: MockResourceOptions<T, TCreate>): MockResource<T, TCreate> {
  let records = [...initialData];
  let nextId = records.length + 1;

  return {
    async list(params = {}) {
      return listMockRows(records, params, { getSearchText, getStatus });
    },
    async create(input) {
      const created = createEntity(input, `${idPrefix}-${String(nextId).padStart(4, '0')}`);
      nextId += 1;
      records = [created, ...records];
      return waitForMockResponse(created);
    },
  };
}
