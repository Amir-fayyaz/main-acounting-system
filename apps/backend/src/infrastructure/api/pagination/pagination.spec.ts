import { describe, expect, it } from 'vitest';
import { paginate, paginationMeta } from './pagination.js';
import type { PaginationQueryDto } from './pagination-query.dto.js';

function query(page: number, limit: number): PaginationQueryDto {
  return { page, limit };
}

describe('pagination', () => {
  it('describes a multi-page collection', () => {
    expect(paginationMeta(42, query(2, 20))).toEqual({
      page: 2,
      limit: 20,
      total: 42,
      totalPages: 3,
    });
  });

  it('reports zero pages for an empty collection', () => {
    expect(paginationMeta(0, query(1, 20))).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it('slices items for the requested page', () => {
    const result = paginate([1, 2, 3, 4, 5], query(2, 2));

    expect(result.data).toEqual([3, 4]);
    expect(result.meta).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
  });

  it('returns an empty page past the end without failing', () => {
    const result = paginate([1, 2], query(5, 20));

    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(2);
    expect(result.meta.totalPages).toBe(1);
  });
});
