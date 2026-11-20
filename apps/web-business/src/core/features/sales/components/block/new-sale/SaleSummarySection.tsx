'use client';

import { Badge, Card, Input, P, Small } from '@repo/web';

import type { SaleStatus } from '../../../assets/@types/sale';
import { formatMoney } from '../../../utils/format';

export type SaleSummarySectionProps = {
  subtotal: number;
  discountPercent: string;
  taxPercent: string;
  taxAmount: number;
  total: number;
  paid: number;
  rest: number;
  commission: number;
  rate: number;
  status: SaleStatus;
  disabled: boolean;
  onDiscountPercentChange: (value: string) => void;
  onTaxPercentChange: (value: string) => void;
};

const STATUS_VARIANT: Record<SaleStatus, 'success' | 'secondary' | 'destructive'> = {
  'تسویه‌شده': 'success',
  'پرداخت جزئی': 'secondary',
  'تسویه‌نشده': 'destructive',
};

/** Discount/tax inputs plus the invoice totals, balance and commission summary. */
export function SaleSummarySection({
  subtotal,
  discountPercent,
  taxPercent,
  taxAmount,
  total,
  paid,
  rest,
  commission,
  rate,
  status,
  disabled,
  onDiscountPercentChange,
  onTaxPercentChange,
}: SaleSummarySectionProps) {
  return (
    <Card className="p-4">
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <Small>جمع ردیف‌ها</Small>
          <Small className="font-medium tabular-nums">{formatMoney(subtotal)}</Small>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Small className="font-medium">تخفیف (درصد)</Small>
            <Input
              value={discountPercent}
              inputMode="numeric"
              onChange={(event) => onDiscountPercentChange(event.target.value)}
              aria-label="تخفیف"
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Small className="font-medium">مالیات بر ارزش افزوده (درصد)</Small>
            <Input
              value={taxPercent}
              inputMode="numeric"
              onChange={(event) => onTaxPercentChange(event.target.value)}
              aria-label="مالیات"
              disabled={disabled}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Small>مالیات</Small>
          <Small className="font-medium tabular-nums">{formatMoney(taxAmount)}</Small>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <Small className="text-base font-bold">مبلغ نهایی</Small>
          <Small className="text-base font-bold tabular-nums">{formatMoney(total)}</Small>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Small>پرداخت‌شده</Small>
          <Small className="font-medium tabular-nums">{formatMoney(paid)}</Small>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Small>مانده</Small>
          <Small className="font-medium tabular-nums">{formatMoney(rest)}</Small>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Small>پورسانت فروشنده ({rate.toLocaleString('fa-IR')}٪)</Small>
          <Small className="font-medium tabular-nums">{formatMoney(commission)}</Small>
        </div>

        {paid > total ? (
          <P className="rounded-sm bg-accent p-3 text-xs text-accent-foreground" role="alert">
            مبلغ پرداخت از مبلغ فاکتور بیشتر است.
          </P>
        ) : total > 0 ? (
          <div>
            <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
