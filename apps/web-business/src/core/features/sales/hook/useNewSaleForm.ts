'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import type { CreateSaleInput } from '../assets/@types/sale';
import { BRANCHES, NAMES, RATES, SELLERS } from '../assets/mock/sales.mock';
import { createSale } from '../lib/sales.service';
import { validateSaleForm, type SaleFormErrors } from '../lib/sale-form.schema';
import { calculateSaleTotals } from '../utils/calculations';

export const SALE_PAYMENT_METHODS = ['نقد', 'کارت', 'چک', 'حواله'] as const;
export const SALE_INVOICE_TYPES = ['فاکتور فروش', 'پیش‌فاکتور'] as const;

export type SaleLineItem = { name: string; qty: string; price: string };
export type SalePayment = { method: string; amount: string };

const INITIAL_LINES: SaleLineItem[] = [{ name: 'خدمات حسابداری', qty: '1', price: '25000000' }];
const INITIAL_PAYMENTS: SalePayment[] = [{ method: 'نقد', amount: '' }];

/**
 * State and handlers for the "new sale" form: field values, line items,
 * payments, derived totals and submission. Presentation stays in the block
 * components that consume these values.
 */
export function useNewSaleForm() {
  const router = useRouter();

  const [cust, setCust] = useState<string>(NAMES[0]);
  const [seller, setSeller] = useState<string>(SELLERS[0]);
  const [branch, setBranch] = useState<string>(BRANCHES[0]);
  const [invoiceType, setInvoiceType] = useState<string>(SALE_INVOICE_TYPES[0]);
  const [date, setDate] = useState<string>(new Date().toLocaleDateString('fa-IR'));
  const [desc, setDesc] = useState('');
  const [lines, setLines] = useState<SaleLineItem[]>(INITIAL_LINES);
  const [payments, setPayments] = useState<SalePayment[]>(INITIAL_PAYMENTS);
  const [discountPercent, setDiscountPercent] = useState('0');
  const [taxPercent, setTaxPercent] = useState('10');
  const [errors, setErrors] = useState<SaleFormErrors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const rate = RATES[seller] ?? 0;
  const totals = calculateSaleTotals({
    lines,
    payments,
    discountPercent,
    taxPercent,
    commissionRate: rate,
  });

  function updateLine(index: number, patch: Partial<SaleLineItem>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((current) => [...current, { name: '', qty: '1', price: '' }]);
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, i) => i !== index));
  }

  function updatePayment(index: number, patch: Partial<SalePayment>) {
    setPayments((current) =>
      current.map((payment, i) => (i === index ? { ...payment, ...patch } : payment)),
    );
  }

  function addPayment() {
    setPayments((current) => [...current, { method: 'کارت', amount: '' }]);
  }

  function removePayment(index: number) {
    setPayments((current) => current.filter((_, i) => i !== index));
  }

  async function submit() {
    if (submitting) return;

    const values: CreateSaleInput = {
      cust,
      seller,
      branch,
      desc,
      gross: String(totals.subtotal),
      discountPercent,
      taxPercent,
      paid: String(totals.paid),
      date,
    };

    const nextErrors = validateSaleForm(values);
    setErrors(nextErrors);
    setFormError(undefined);
    if (Object.keys(nextErrors).length > 0) {
      setFormError('لطفاً خطاهای فرم را برطرف کنید.');
      return;
    }

    if (totals.paid > totals.total) {
      setFormError('مبلغ پرداخت از مبلغ فاکتور بیشتر است.');
      return;
    }

    setSubmitting(true);
    try {
      await createSale(values);
      toast.success('فاکتور ثبت شد');
      router.push('/sales');
    } catch (error) {
      setSubmitting(false);
      setFormError(
        error instanceof Error && error.message
          ? error.message
          : 'ثبت فاکتور با مشکل مواجه شد. لطفاً دوباره تلاش کنید.',
      );
    }
  }

  function cancel() {
    router.push('/sales');
  }

  return {
    invoice: {
      cust,
      seller,
      branch,
      invoiceType,
      date,
      desc,
      errors,
      disabled: submitting,
      onCustChange: setCust,
      onSellerChange: setSeller,
      onBranchChange: setBranch,
      onInvoiceTypeChange: setInvoiceType,
      onDateChange: setDate,
      onDescChange: setDesc,
    },
    items: {
      lines,
      disabled: submitting,
      onLineChange: updateLine,
      onAddLine: addLine,
      onRemoveLine: removeLine,
    },
    payments: {
      payments,
      disabled: submitting,
      onPaymentChange: updatePayment,
      onAddPayment: addPayment,
      onRemovePayment: removePayment,
    },
    summary: {
      ...totals,
      discountPercent,
      taxPercent,
      rate,
      disabled: submitting,
      onDiscountPercentChange: setDiscountPercent,
      onTaxPercentChange: setTaxPercent,
    },
    formError,
    submitting,
    canSubmit: !submitting && totals.total > 0 && totals.paid <= totals.total,
    submit,
    cancel,
  };
}
