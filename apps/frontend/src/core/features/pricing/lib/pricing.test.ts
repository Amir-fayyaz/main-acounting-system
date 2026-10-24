import { describe, expect, it } from 'vitest';

import {
  getBilledAmount,
  getBilledLabel,
  getBillingSummary,
  getMonthlyPrice,
  getPlanHref,
} from './pricing';

describe('pricing helpers', () => {
  it('keeps the monthly price for monthly billing', () => {
    expect(getMonthlyPrice(790_000, 'month')).toBe(790_000);
    expect(getBilledAmount(790_000, 'month')).toBeNull();
  });

  it('applies the sample annual discount and totals the yearly payment', () => {
    expect(getMonthlyPrice(1_490_000, 'year')).toBe(1_192_000);
    expect(getBilledAmount(1_490_000, 'year')).toBe(14_304_000);
    expect(getBilledLabel(1_490_000, 'year')).toBe(
      'پرداخت سالانه ۱۴٬۳۰۴٬۰۰۰ تومان',
    );
  });

  it('describes the selected billing period', () => {
    expect(getBillingSummary('month')).toBe('نمایش تعرفه‌های ماهانه نمونه');
    expect(getBillingSummary('year')).toBe(
      'نمایش قیمت ماهانه با پرداخت سالانه و ۲۰٪ تخفیف نمونه',
    );
  });

  it('builds a plan link for the active period', () => {
    expect(getPlanHref('starter', 'month')).toBe('/auth?plan=starter&period=month');
    expect(getPlanHref('pro', 'year')).toBe('/auth?plan=pro&period=year');
  });
});
