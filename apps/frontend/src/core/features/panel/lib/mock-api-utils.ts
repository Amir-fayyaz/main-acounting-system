import type { PaginatedResponse } from '@repo/web';
import type { ListParams } from '../assets/@types';
import { filterMockRows, paginateMockRows, waitForMockResponse } from '../assets/mock/mock-utils';

interface MockResourceOptions<T extends { id: string }, TCreate> {
  initialData: T[];
  getSearchText: (row: T) => string;
  createEntity: (input: TCreate, id: string) => T;
  idPrefix: string;
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
}: MockResourceOptions<T, TCreate>): MockResource<T, TCreate> {
  let records = [...initialData];
  let nextId = records.length + 1;

  return {
    async list(params = {}) {
      const filtered = filterMockRows(records, params.search, getSearchText);
      return waitForMockResponse(paginateMockRows(filtered, params));
    },
    async create(input) {
      const created = createEntity(input, `${idPrefix}-${String(nextId).padStart(4, '0')}`);
      nextId += 1;
      records = [created, ...records];
      return waitForMockResponse(created);
    },
  };
}
