import type { BillingPeriod, PricedPlanId } from '@/core/features/landing/assets/@types/pricing';
import { formatPersianNumber } from '@/core/features/landing/utils/formatPersianNumber';

export const ANNUAL_DISCOUNT_RATE = 0.2;

export function getMonthlyPrice(monthlyPrice: number, period: BillingPeriod): number {
  return period === 'year' ? Math.round(monthlyPrice * (1 - ANNUAL_DISCOUNT_RATE)) : monthlyPrice;
}

export function getBilledAmount(monthlyPrice: number, period: BillingPeriod): number | null {
  return period === 'year' ? getMonthlyPrice(monthlyPrice, period) * 12 : null;
}

export function getBilledLabel(monthlyPrice: number, period: BillingPeriod): string {
  const annualTotal = getBilledAmount(monthlyPrice, period);

  return annualTotal === null
    ? 'پرداخت ماهانه؛ مبلغ نمایشی'
    : `پرداخت سالانه ${formatPersianNumber(annualTotal)} تومان`;
}

export function getBillingSummary(period: BillingPeriod): string {
  return period === 'year'
    ? 'نمایش قیمت ماهانه با پرداخت سالانه و ۲۰٪ تخفیف نمونه'
    : 'نمایش تعرفه‌های ماهانه نمونه';
}

export function getPlanHref(planId: PricedPlanId, period: BillingPeriod): string {
  return `/auth?plan=${planId}&period=${period}`;
}
