'use client';

import {
  Button,
  Card,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Small,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/web';
import { Plus, Trash2 } from 'lucide-react';

import { SALE_PAYMENT_METHODS, type SalePayment } from '../../../hook/useNewSaleForm';

export type SalePaymentsSectionProps = {
  payments: readonly SalePayment[];
  disabled: boolean;
  onPaymentChange: (index: number, patch: Partial<SalePayment>) => void;
  onAddPayment: () => void;
  onRemovePayment: (index: number) => void;
};

/** Multi-method payment rows (cash, card, cheque, transfer). */
export function SalePaymentsSection({
  payments,
  disabled,
  onPaymentChange,
  onAddPayment,
  onRemovePayment,
}: SalePaymentsSectionProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 pb-3">
        <Small className="text-base font-bold">پرداخت‌ها</Small>
        <Button type="button" variant="outline" size="sm" onClick={onAddPayment} disabled={disabled}>
          <Plus className="size-4" aria-hidden="true" />
          روش پرداخت
        </Button>
      </div>

      <Table aria-label="پرداخت‌ها">
        <TableHeader>
          <TableRow>
            <TableHead>روش</TableHead>
            <TableHead>مبلغ (ریال)</TableHead>
            <TableHead aria-label="حذف" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment, index) => (
            <TableRow key={index}>
              <TableCell>
                <Select
                  value={payment.method}
                  onValueChange={(value) => onPaymentChange(index, { method: value })}
                  disabled={disabled}
                >
                  <SelectTrigger aria-label="روش پرداخت" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SALE_PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Input
                  value={payment.amount}
                  inputMode="numeric"
                  onChange={(event) => onPaymentChange(index, { amount: event.target.value })}
                  aria-label="مبلغ پرداخت"
                  disabled={disabled}
                />
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="حذف"
                  disabled={disabled || payments.length < 2}
                  onClick={() => onRemovePayment(index)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
