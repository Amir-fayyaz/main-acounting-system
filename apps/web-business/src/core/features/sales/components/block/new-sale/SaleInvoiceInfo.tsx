'use client';

import {
  Card,
  Input,
  InputErrorMassage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Small,
} from '@repo/web';

import { BRANCHES, NAMES, SELLERS } from '../../../assets/mock/sales.mock';
import type { SaleFormErrors } from '../../../lib/sale-form.schema';
import { SALE_INVOICE_TYPES } from '../../../hook/useNewSaleForm';

export type SaleInvoiceInfoProps = {
  cust: string;
  seller: string;
  branch: string;
  invoiceType: string;
  date: string;
  desc: string;
  errors: SaleFormErrors;
  disabled: boolean;
  onCustChange: (value: string) => void;
  onSellerChange: (value: string) => void;
  onBranchChange: (value: string) => void;
  onInvoiceTypeChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onDescChange: (value: string) => void;
};

/** Customer, seller, branch, invoice type, date and description of a new sale. */
export function SaleInvoiceInfo({
  cust,
  seller,
  branch,
  invoiceType,
  date,
  desc,
  errors,
  disabled,
  onCustChange,
  onSellerChange,
  onBranchChange,
  onInvoiceTypeChange,
  onDateChange,
  onDescChange,
}: SaleInvoiceInfoProps) {
  return (
    <Card className="p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="grid gap-2">
          <Small className="font-medium">مشتری</Small>
          <Select value={cust} onValueChange={onCustChange} disabled={disabled}>
            <SelectTrigger aria-label="مشتری" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NAMES.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.cust ? <InputErrorMassage role="alert">{errors.cust}</InputErrorMassage> : null}
        </div>

        <div className="grid gap-2">
          <Small className="font-medium">تاریخ</Small>
          <Input
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
            aria-label="تاریخ"
            disabled={disabled}
          />
        </div>

        <div className="grid gap-2">
          <Small className="font-medium">شعبه</Small>
          <Select value={branch} onValueChange={onBranchChange} disabled={disabled}>
            <SelectTrigger aria-label="شعبه" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BRANCHES.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Small className="font-medium">فروشنده</Small>
          <Select value={seller} onValueChange={onSellerChange} disabled={disabled}>
            <SelectTrigger aria-label="فروشنده" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SELLERS.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.seller ? <InputErrorMassage role="alert">{errors.seller}</InputErrorMassage> : null}
        </div>

        <div className="grid gap-2">
          <Small className="font-medium">نوع</Small>
          <Select value={invoiceType} onValueChange={onInvoiceTypeChange} disabled={disabled}>
            <SelectTrigger aria-label="نوع فاکتور" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SALE_INVOICE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <Small className="font-medium">شرح فاکتور</Small>
        <Input
          value={desc}
          onChange={(event) => onDescChange(event.target.value)}
          placeholder="توضیحات حسابدار درباره‌ی این فاکتور (اختیاری)"
          aria-label="شرح فاکتور"
          disabled={disabled}
        />
      </div>
    </Card>
  );
}
