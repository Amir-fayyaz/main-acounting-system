'use client';

import {
  Button,
  Card,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/web';
import { Plus, Trash2 } from 'lucide-react';

import type { SaleLineItem } from '../../../hook/useNewSaleForm';
import { parseNumberInput } from '../../../utils/number';
import { formatMoney } from '../../../utils/format';

export type SaleItemsSectionProps = {
  lines: readonly SaleLineItem[];
  disabled: boolean;
  onLineChange: (index: number, patch: Partial<SaleLineItem>) => void;
  onAddLine: () => void;
  onRemoveLine: (index: number) => void;
};

/** Editable invoice line items (goods/services, quantity, unit price). */
export function SaleItemsSection({
  lines,
  disabled,
  onLineChange,
  onAddLine,
  onRemoveLine,
}: SaleItemsSectionProps) {
  return (
    <Card className="p-4">
      <Table aria-label="ردیف‌های فاکتور">
        <TableHeader>
          <TableRow>
            <TableHead>کالا / خدمت</TableHead>
            <TableHead>تعداد</TableHead>
            <TableHead>قیمت واحد (ریال)</TableHead>
            <TableHead>جمع (ریال)</TableHead>
            <TableHead aria-label="حذف" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line, index) => (
            <TableRow key={index}>
              <TableCell>
                <Input
                  value={line.name}
                  onChange={(event) => onLineChange(index, { name: event.target.value })}
                  aria-label="کالا"
                  disabled={disabled}
                />
              </TableCell>
              <TableCell>
                <Input
                  value={line.qty}
                  inputMode="numeric"
                  onChange={(event) => onLineChange(index, { qty: event.target.value })}
                  aria-label="تعداد"
                  disabled={disabled}
                />
              </TableCell>
              <TableCell>
                <Input
                  value={line.price}
                  inputMode="numeric"
                  onChange={(event) => onLineChange(index, { price: event.target.value })}
                  aria-label="قیمت"
                  disabled={disabled}
                />
              </TableCell>
              <TableCell className="tabular-nums">
                {formatMoney(parseNumberInput(line.qty) * parseNumberInput(line.price))}
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="حذف"
                  disabled={disabled || lines.length < 2}
                  onClick={() => onRemoveLine(index)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="mt-3">
        <Button type="button" variant="outline" size="sm" onClick={onAddLine} disabled={disabled}>
          <Plus className="size-4" aria-hidden="true" />
          ردیف جدید
        </Button>
      </div>
    </Card>
  );
}
