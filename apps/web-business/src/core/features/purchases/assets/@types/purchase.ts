/** Currency codes supported by purchase money values. */
export type CurrencyCode = 'IRR';

/** Money is always a decimal string — never a JS `number`. */
export type Money = string;

/** Purchase lifecycle state shown in the list and the status filter. */
export type PurchaseStatus = 'پرداخت‌شده' | 'تسویه‌نشده' | 'پرداخت جزئی';

/** Whether the purchase invoice carries a discount. */
export type PurchaseDiscountState = 'با تخفیف' | 'بدون تخفیف';

export interface Purchase {
  id: string;
  /** Invoice number (Persian-formatted string). */
  no: string;
  /** Supplier name. */
  supplier: string;
  /** Issue date (Jalali string). */
  date: string;
  /** Discount amount in rials. */
  discount: number;
  /** Discount percentage. */
  discountPercent: number;
  discountState: PurchaseDiscountState;
  /** Final amount after discount (money string). */
  total: Money;
  /** Payment due date (Jalali string). */
  due: string;
  /** Description. */
  description: string;
  status: PurchaseStatus;
  currency: CurrencyCode;
}

/** Fields the purchase form collects; the service fills the remaining defaults. */
export interface CreatePurchaseInput {
  supplier: string;
  /** Gross amount before discount, as a string. */
  total: string;
  /** Discount percentage (0–100). */
  discountPercent: string;
  due: string;
  description: string;
}
