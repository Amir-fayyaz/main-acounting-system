import { describe, expect, it } from 'vitest';

import { createBranch, listAllBranches, listBranches } from '../lib/branches.service';

const SEEDED_TOTAL = 23;
const SEEDED_INACTIVE = 4;

describe('branches service', () => {
  it('applies the shared defaults: page 1, limit 20, server meta', async () => {
    const { data, meta } = await listBranches();

    expect(meta).toEqual({ page: 1, limit: 20, total: SEEDED_TOTAL, totalPages: 2 });
    expect(data).toHaveLength(20);
  });

  it('returns the remaining rows on the next page', async () => {
    const { data, meta } = await listBranches({ page: 2 });

    expect(meta.page).toBe(2);
    expect(data).toHaveLength(SEEDED_TOTAL - 20);
  });

  it('clamps out-of-range pages and limits', async () => {
    const beyondLast = await listBranches({ page: 99 });
    expect(beyondLast.meta.page).toBe(beyondLast.meta.totalPages);

    const clamped = await listBranches({ limit: 500 });
    expect(clamped.meta.limit).toBe(100);
    expect(clamped.meta.totalPages).toBe(1);
  });

  it('filters by search term', async () => {
    const { data, meta } = await listBranches({ search: 'شیراز' });

    expect(meta.total).toBe(1);
    expect(data[0]?.name).toBe('شعبه شیراز');
  });

  it('filters by status', async () => {
    const { data, meta } = await listBranches({ status: 'inactive' });

    expect(meta.total).toBe(SEEDED_INACTIVE);
    expect(data.every((branch) => branch.status === 'inactive')).toBe(true);
  });

  it('combines search, status and pagination', async () => {
    const { data, meta } = await listBranches({ search: 'شعبه', status: 'active', limit: 5 });

    expect(data.every((branch) => branch.status === 'active')).toBe(true);
    expect(data.every((branch) => branch.name.includes('شعبه'))).toBe(true);
    expect(meta.total).toBe(SEEDED_TOTAL - SEEDED_INACTIVE - 1);
    expect(data).toHaveLength(5);
    expect(meta.totalPages).toBe(Math.ceil(meta.total / 5));
  });

  it('creates a branch that the list then returns first', async () => {
    const created = await createBranch({
      code: '900',
      name: 'شعبه تست',
      managerName: 'کاربر تست',
    });

    expect(created).toMatchObject({
      code: '900',
      name: 'شعبه تست',
      managerName: 'کاربر تست',
      status: 'active',
      monthlySales: '0.00',
      currency: 'IRR',
    });

    const { data, meta } = await listBranches();
    expect(meta.total).toBe(SEEDED_TOTAL + 1);
    expect(data[0]?.id).toBe(created.id);
    expect(await listBranches({ search: 'شعبه تست' })).toMatchObject({ meta: { total: 1 } });
  });

  it('rejects a duplicate branch code', async () => {
    const rejection = await createBranch({
      code: '900',
      name: 'شعبه تکراری',
      managerName: 'کاربر تست',
    }).catch((error: unknown) => error);

    expect(rejection).toBeInstanceOf(Error);
    expect((rejection as Error).message).toContain('قبلاً ثبت شده است');
  });
});

describe('listAllBranches (print source)', () => {
  it('returns every matching branch instead of a single page', async () => {
    const all = await listAllBranches();
    const paged = await listBranches({ limit: 100 });

    expect(all).toHaveLength(paged.meta.total);
    // The default page size is 20, so an unpaginated result must exceed it.
    expect(all.length).toBeGreaterThan(20);
  });

  it('reuses the list filters without pagination', async () => {
    const all = await listAllBranches({ search: 'شعبه', status: 'inactive' });

    expect(all.length).toBeGreaterThan(0);
    expect(all.every((branch) => branch.status === 'inactive')).toBe(true);
    expect(all.every((branch) => branch.name.includes('شعبه'))).toBe(true);
  });

  it('returns an empty list when no branch matches', async () => {
    expect(await listAllBranches({ search: 'شعبه‌ای که وجود ندارد' })).toEqual([]);
  });
});
