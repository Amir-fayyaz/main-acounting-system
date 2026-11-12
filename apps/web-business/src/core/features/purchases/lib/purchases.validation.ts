import type { CreatePurchaseInput } from '../assets/@types/purchase';

export type PurchaseFormErrors = Partial<Record<keyof CreatePurchaseInput, string>>;

export function validatePurchaseForm(values: CreatePurchaseInput): PurchaseFormErrors {
  const errors: PurchaseFormErrors = {};
  if (!values.supplier.trim()) errors.supplier = 'نام تأمین‌کننده الزامی است.';
  const total = Number(values.total);
  if (!Number.isFinite(total) || total <= 0) errors.total = 'مبلغ فاکتور را وارد کنید.';
  const pct = Number(values.discountPercent);
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
    errors.discountPercent = 'درصد تخفیف باید بین ۰ تا ۱۰۰ باشد.';
  }
  return errors;
}
