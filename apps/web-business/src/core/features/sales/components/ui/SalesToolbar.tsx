'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/web';
import { cn } from '@repo/web/ui/utils/cn';

import { SELLERS } from '../../assets/mock/sales.mock';

const ALL = '__all__';

const STATUS_OPTIONS = ['تسویه‌شده', 'پرداخت جزئی', 'تسویه‌نشده'] as const;
const DISCOUNT_OPTIONS = ['با تخفیف', 'بدون تخفیف'] as const;

export type SalesToolbarProps = {
  status: string;
  seller: string;
  discountState: string;
  onStatusChange: (value: string) => void;
  onSellerChange: (value: string) => void;
  onDiscountStateChange: (value: string) => void;
  className?: string;
};

export function SalesToolbar({
  status,
  seller,
  discountState,
  onStatusChange,
  onSellerChange,
  onDiscountStateChange,
  className,
}: SalesToolbarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2.5', className)}>
      <Select value={status || ALL} onValueChange={(n) => onStatusChange(n === ALL ? '' : n)}>
        <SelectTrigger aria-label="وضعیت" className="w-36">
          <SelectValue placeholder="وضعیت" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>وضعیت: همه</SelectItem>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={seller || ALL} onValueChange={(n) => onSellerChange(n === ALL ? '' : n)}>
        <SelectTrigger aria-label="فروشنده" className="w-36">
          <SelectValue placeholder="فروشنده" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>فروشنده: همه</SelectItem>
          {SELLERS.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={discountState || ALL} onValueChange={(n) => onDiscountStateChange(n === ALL ? '' : n)}>
        <SelectTrigger aria-label="تخفیف" className="w-36">
          <SelectValue placeholder="تخفیف" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>تخفیف: همه</SelectItem>
          {DISCOUNT_OPTIONS.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
