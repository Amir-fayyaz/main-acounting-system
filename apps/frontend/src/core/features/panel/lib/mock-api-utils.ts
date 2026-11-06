import type { PaginatedResponse } from '@repo/web';
import type { ListParams } from '../assets/@types';
import { filterMockRows, paginateMockRows, waitForMockResponse } from '../assets/mock/mock-utils';

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
      let rows = filterMockRows(records, params.search, getSearchText);
      const requestedStatus = params.status?.trim().toLowerCase();
      if (getStatus && requestedStatus) {
        rows = rows.filter((row) => getStatus(row).trim().toLowerCase() === requestedStatus);
      }
      return waitForMockResponse(paginateMockRows(rows, params));
    },
    async create(input) {
      const created = createEntity(input, `${idPrefix}-${String(nextId).padStart(4, '0')}`);
      nextId += 1;
      records = [created, ...records];
      return waitForMockResponse(created);
    },
  };
}
