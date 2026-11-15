import { describe, expect, it } from 'vitest';

import { createPurchase, listAllPurchases, listPurchases } from '../lib/purchases.service';

const SEEDED_TOTAL = 30;

describe('purchases service', () => {
  it('applies the shared defaults: page 1, limit 20, server meta', async () => {
    const { data, meta } = await listPurchases();

    expect(meta).toEqual({ page: 1, limit: 20, total: SEEDED_TOTAL, totalPages: 2 });
    expect(data).toHaveLength(20);
  });

  it('clamps out-of-range pages and limits', async () => {
    const beyondLast = await listPurchases({ page: 99 });
    expect(beyondLast.meta.page).toBe(beyondLast.meta.totalPages);

    const clamped = await listPurchases({ limit: 500 });
    expect(clamped.meta.limit).toBe(100);
    expect(clamped.meta.totalPages).toBe(1);
  });

  it('filters by status and discount state', async () => {
    const settled = await listPurchases({ status: 'پرداخت‌شده', limit: 100 });
    expect(settled.data.every((purchase) => purchase.status === 'پرداخت‌شده')).toBe(true);

    const discounted = await listPurchases({ discountState: 'با تخفیف', limit: 100 });
    expect(discounted.data.every((purchase) => purchase.discountState === 'با تخفیف')).toBe(true);
  });

  it('filters by search term', async () => {
    const { data, meta } = await listPurchases({ search: 'داروخانه مهر' });

    expect(meta.total).toBeGreaterThan(0);
    expect(data.every((purchase) => purchase.supplier === 'داروخانه مهر')).toBe(true);
    expect((await listAllPurchases({ search: 'داروخانه مهر' })).length).toBe(meta.total);
  });

  it('creates a purchase and applies the discount to the total', async () => {
    const created = await createPurchase({
      supplier: 'تأمین‌کننده تست',
      total: '1000000',
      discountPercent: '10',
      due: '',
      description: 'خرید تست',
    });

    expect(created.discount).toBe(100000);
    expect(created.total).toBe('900000.00');
    expect(created.discountState).toBe('با تخفیف');
    expect(created.status).toBe('تسویه‌نشده');

    const { data, meta } = await listPurchases();
    expect(meta.total).toBe(SEEDED_TOTAL + 1);
    expect(data[0]?.id).toBe(created.id);
  });
});
