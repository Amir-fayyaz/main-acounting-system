'use client';

import {
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/web';
import { cn } from '@repo/web/ui/utils/cn';

import { PURCHASE_STATUS_OPTIONS } from './PurchaseStatusBadge';

const ALL_STATUS = '__all__';
const ALL_DISCOUNT = '__all_discount__';

export type PurchasesToolbarProps = {
  status: string;
  discountState: string;
  onStatusChange: (value: string) => void;
  onDiscountStateChange: (value: string) => void;
  className?: string;
};

export function PurchasesToolbar({
  status,
  discountState,
  onStatusChange,
  onDiscountStateChange,
  className,
}: PurchasesToolbarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2.5', className)}>
      <div className="max-w-xs min-w-50 flex-1">
        <SearchInput title="جستجو در خریدها…" />
      </div>

      <Select
        value={status || ALL_STATUS}
        onValueChange={(next) => onStatusChange(next === ALL_STATUS ? '' : next)}
      >
        <SelectTrigger aria-label="وضعیت فاکتور" className="w-40">
          <SelectValue placeholder="وضعیت" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_STATUS}>وضعیت: همه</SelectItem>
          {PURCHASE_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={discountState || ALL_DISCOUNT}
        onValueChange={(next) =>
          onDiscountStateChange(next === ALL_DISCOUNT ? '' : next)
        }
      >
        <SelectTrigger aria-label="تخفیف" className="w-40">
          <SelectValue placeholder="تخفیف" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_DISCOUNT}>تخفیف: همه</SelectItem>
          <SelectItem value="با تخفیف">با تخفیف</SelectItem>
          <SelectItem value="بدون تخفیف">بدون تخفیف</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
