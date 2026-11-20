import { describe, expect, it } from 'vitest';

import { createMockResource } from '../lib/mock-api-utils';

interface Row {
  id: string;
  title: string;
  status: 'active' | 'inactive';
}

const initialRows: Row[] = [
  { id: 'row-0001', title: 'alpha', status: 'active' },
  { id: 'row-0002', title: 'beta', status: 'inactive' },
  { id: 'row-0003', title: 'gamma', status: 'active' },
  { id: 'row-0004', title: 'delta', status: 'inactive' },
  { id: 'row-0005', title: 'epsilon', status: 'active' },
];

function createResource({ withStatusFilter }: { withStatusFilter: boolean }) {
  return createMockResource<Row, Row>({
    initialData: initialRows,
    idPrefix: 'row',
    getSearchText: (row) => row.title,
    createEntity: (input, id) => ({ ...input, id }),
    ...(withStatusFilter ? { getStatus: (row: Row) => row.status } : {}),
  });
}

const resource = createResource({ withStatusFilter: true });
const plainResource = createResource({ withStatusFilter: false });

describe('createMockResource status filtering', () => {
  it('returns only rows matching the requested status', async () => {
    const result = await resource.list({ status: 'active' });
    expect(result.data.map((row) => row.id)).toEqual(['row-0001', 'row-0003', 'row-0005']);
    expect(result.meta.total).toBe(3);
  });

  it('returns an empty page when no row matches the status', async () => {
    const result = await resource.list({ status: 'retired' });
    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
    expect(result.meta.totalPages).toBe(0);
  });

  it('matches the status case-insensitively', async () => {
    const result = await resource.list({ status: 'ACTIVE' });
    expect(result.data.map((row) => row.id)).toEqual(['row-0001', 'row-0003', 'row-0005']);
    expect(result.meta.total).toBe(3);
  });

  it('combines search and status filtering', async () => {
    const matched = await resource.list({ search: 'gam', status: 'active' });
    expect(matched.data.map((row) => row.id)).toEqual(['row-0003']);

    const excluded = await resource.list({ search: 'bet', status: 'active' });
    expect(excluded.data).toEqual([]);
    expect(excluded.meta.total).toBe(0);
  });

  it('applies status filtering before pagination', async () => {
    const page1 = await resource.list({ status: 'active', page: 1, limit: 2 });
    expect(page1.data.map((row) => row.id)).toEqual(['row-0001', 'row-0003']);
    expect(page1.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });

    const page2 = await resource.list({ status: 'active', page: 2, limit: 2 });
    expect(page2.data.map((row) => row.id)).toEqual(['row-0005']);
    expect(page2.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });

  it('ignores the status param when getStatus is absent', async () => {
    const result = await plainResource.list({ status: 'active' });
    expect(result.data).toHaveLength(5);
    expect(result.meta.total).toBe(5);
  });

  it('keeps existing search and pagination behavior when getStatus is absent', async () => {
    const searched = await plainResource.list({ search: 'beta' });
    expect(searched.data.map((row) => row.id)).toEqual(['row-0002']);
    expect(searched.meta.total).toBe(1);

    const defaultPage = await plainResource.list();
    expect(defaultPage.data).toHaveLength(5);
    expect(defaultPage.meta).toEqual({ page: 1, limit: 20, total: 5, totalPages: 1 });
  });
});
