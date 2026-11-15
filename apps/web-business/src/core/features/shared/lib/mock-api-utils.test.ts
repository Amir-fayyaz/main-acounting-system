import { describe, expect, it } from 'vitest';

import { listMockRows } from '../lib/mock-api-utils';

const rows = [
  { id: '1', title: 'Invoice A', status: 'settled' },
  { id: '2', title: 'Invoice B', status: 'unsettled' },
  { id: '3', title: 'Invoice C', status: 'settled' },
];

describe('listMockRows', () => {
  it('returns paginated rows by default', async () => {
    const result = await listMockRows(
      rows,
      { page: 1, limit: 2 },
      { getSearchText: (r: (typeof rows)[number]) => r.title },
    );
    expect(result.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(result.data).toHaveLength(2);
  });

  it('returns all rows when noPage is true', async () => {
    const result = await listMockRows(
      rows,
      { noPage: true },
      { getSearchText: (r: (typeof rows)[number]) => r.title },
    );
    expect(result.meta).toEqual({ page: 1, limit: 3, total: 3, totalPages: 1 });
    expect(result.data).toHaveLength(3);
  });

  it('filters by search text', async () => {
    const result = await listMockRows(
      rows,
      { search: 'B' },
      { getSearchText: (r: (typeof rows)[number]) => r.title },
    );
    expect(result.data).toHaveLength(1);
    expect(result.data[0].title).toBe('Invoice B');
  });

  it('filters by status', async () => {
    const result = await listMockRows(
      rows,
      { status: 'settled' },
      {
        getSearchText: (r: (typeof rows)[number]) => r.title,
        getStatus: (r: (typeof rows)[number]) => r.status,
      },
    );
    expect(result.data).toHaveLength(2);
    expect(result.data.every((r) => r.status === 'settled')).toBe(true);
  });

  it('is case-insensitive', async () => {
    const result = await listMockRows(
      rows,
      { search: 'invoice' },
      { getSearchText: (r: (typeof rows)[number]) => r.title },
    );
    expect(result.data).toHaveLength(3);
  });

  it('returns empty for no matches', async () => {
    const result = await listMockRows(
      rows,
      { search: 'nonexistent' },
      { getSearchText: (r: (typeof rows)[number]) => r.title },
    );
    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
  });
});
