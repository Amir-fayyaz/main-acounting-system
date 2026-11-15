/** Currency codes supported by sale money values. */
export type CurrencyCode = 'IRR';

/** Money is always a decimal string — never a JS `number`. */
export type Money = string;

/** Sale lifecycle state shown in the list and the status filter. */
export type SaleStatus = 'تسویه‌شده' | 'تسویه‌نشده' | 'پرداخت جزئی';

export interface Sale {
  id: string;
  /** Invoice number (Persian-formatted string). */
  no: string;
  /** Customer name. */
  cust: string;
  /** Seller name. */
  seller: string;
  /** Issue date (Jalali string). */
  date: string;
  /** Discount amount in rials. */
  disc: number;
  /** Discount percentage. */
  pct: number;
  discountState: 'با تخفیف' | 'بدون تخفیف';
  /** Final amount after discount + tax (money string). */
  total: Money;
  /** Paid amount (money string). */
  paid: Money;
  /** Commission amount (money string). */
  comm: Money;
  /** Commission rate (percent). */
  rate: number;
  /** Description. */
  desc: string;
  status: SaleStatus;
  currency: CurrencyCode;
}

/** Fields the sale form collects. */
export interface CreateSaleInput {
  cust: string;
  seller: string;
  branch: string;
  desc: string;
  gross: string;
  discountPercent: string;
  taxPercent: string;
  /** Total paid across payment rows. */
  paid?: string;
  /** Issue date (Jalali); defaults to today. */
  date?: string;
}

/** Filters accepted by the sale list endpoint. */
export interface ListSalesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  seller?: string;
  discountState?: string;
}
