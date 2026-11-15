import type { SaleStatus } from '../assets/@types/sale';
import { parseNumberInput } from './number';

export interface SaleLineInput {
  qty: string;
  price: string;
}

export interface SalePaymentInput {
  amount: string;
}

export interface SaleTotalsInput {
  lines: readonly SaleLineInput[];
  payments: readonly SalePaymentInput[];
  discountPercent: string;
  taxPercent: string;
  commissionRate: number;
}

export interface SaleTotals {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paid: number;
  rest: number;
  commission: number;
  status: SaleStatus;
}

export function resolveSaleStatus(total: number, paid: number): SaleStatus {
  if (total > 0 && paid === total) return 'تسویه‌شده';
  return paid > 0 ? 'پرداخت جزئی' : 'تسویه‌نشده';
}

export function calculateSaleTotals({
  lines,
  payments,
  discountPercent,
  taxPercent,
  commissionRate,
}: SaleTotalsInput): SaleTotals {
  const subtotal = lines.reduce(
    (sum, line) => sum + parseNumberInput(line.qty) * parseNumberInput(line.price),
    0,
  );
  const discountAmount = Math.round((subtotal * parseNumberInput(discountPercent)) / 100);
  const taxable = subtotal - discountAmount;
  const taxAmount = Math.round((taxable * parseNumberInput(taxPercent)) / 100);
  const total = taxable + taxAmount;
  const paid = payments.reduce((sum, payment) => sum + parseNumberInput(payment.amount), 0);
  const rest = Math.max(total - paid, 0);
  const commission = Math.round(((total - taxAmount) * commissionRate) / 100);

  return {
    subtotal,
    discountAmount,
    taxAmount,
    total,
    paid,
    rest,
    commission,
    status: resolveSaleStatus(total, paid),
  };
}
