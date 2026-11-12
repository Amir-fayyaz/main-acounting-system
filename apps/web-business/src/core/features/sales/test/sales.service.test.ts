import { describe, expect, it } from 'vitest';

import { createSale, listAllSales, listSales } from '../lib/sales.service';

const SEEDED_TOTAL = 52;

describe('sales service', () => {
  it('applies the shared defaults: page 1, limit 20, server meta', async () => {
    const { data, meta } = await listSales();

    expect(meta).toEqual({ page: 1, limit: 20, total: SEEDED_TOTAL, totalPages: 3 });
    expect(data).toHaveLength(20);
  });

  it('clamps out-of-range pages and limits', async () => {
    const beyondLast = await listSales({ page: 99 });
    expect(beyondLast.meta.page).toBe(beyondLast.meta.totalPages);

    const clamped = await listSales({ limit: 500 });
    expect(clamped.meta.limit).toBe(100);
    expect(clamped.meta.totalPages).toBe(1);
  });

  it('filters by status and seller', async () => {
    const { data, meta } = await listSales({ status: 'تسویه‌شده', seller: 'نگار فرهادی' });

    expect(meta.total).toBeGreaterThan(0);
    expect(data.every((sale) => sale.status === 'تسویه‌شده')).toBe(true);
    expect(data.every((sale) => sale.seller === 'نگار فرهادی')).toBe(true);
  });

  it('filters by discount state', async () => {
    const { data } = await listSales({ discountState: 'بدون تخفیف', limit: 100 });

    expect(data.every((sale) => sale.discountState === 'بدون تخفیف')).toBe(true);
  });

  it('filters by search term', async () => {
    const all = await listAllSales();
    const target = all[0]!;
    const { data, meta } = await listSales({ search: target.no });

    expect(meta.total).toBeGreaterThan(0);
    expect(data.some((sale) => sale.no === target.no)).toBe(true);
  });

  it('creates a sale with discount, tax and commission applied', async () => {
    const created = await createSale({
      cust: 'شرکت آرمان تجارت',
      seller: 'نگار فرهادی',
      branch: 'دفتر مرکزی',
      desc: 'فاکتور تست',
      gross: '1000000',
      discountPercent: '10',
      taxPercent: '9',
    });

    expect(created.disc).toBe(100000);
    expect(created.total).toBe('981000.00');
    expect(created.comm).toBe('18000.00');
    expect(created.rate).toBe(2);
    expect(created.status).toBe('تسویه‌نشده');
    expect(created.discountState).toBe('با تخفیف');

    const { data, meta } = await listSales();
    expect(meta.total).toBe(SEEDED_TOTAL + 1);
    expect(data[0]?.id).toBe(created.id);
  });
});
