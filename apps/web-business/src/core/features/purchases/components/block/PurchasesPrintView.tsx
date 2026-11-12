'use client';

import {
  H1,
  P,
  Small,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/web';
import { cn } from '@repo/web/ui/utils/cn';

import type { Purchase } from '../../assets/@types/purchase';
import { purchasesColumns } from './PurchasesTable';

const PRINT_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('fa-IR', {
  calendar: 'persian',
  dateStyle: 'full',
  timeStyle: 'short',
});

const PRINT_NUMBER_FORMATTER = new Intl.NumberFormat('fa-IR');

export function formatPrintTimestamp(date: Date): string {
  return PRINT_DATE_TIME_FORMATTER.format(date);
}

const PRINT_COLUMN_WIDTHS: Record<string, string> = {
  row: '5%',
  no: '9%',
  supplier: '16%',
  date: '10%',
  discount: '12%',
  total: '12%',
  due: '10%',
  description: '16%',
  status: '10%',
};

function formatCount(value: number): string {
  return PRINT_NUMBER_FORMATTER.format(value);
}

function formatAmount(value: string | number): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);

  return PRINT_NUMBER_FORMATTER.format(numericValue);
}

function renderCell(purchase: Purchase, key: string | undefined) {
  switch (key) {
    case 'no':
      return purchase.no;
    case 'supplier':
      return purchase.supplier;
    case 'date':
      return purchase.date;
    case 'discount':
      return purchase.discount
        ? `${formatAmount(purchase.discount)} (${purchase.discountPercent}٪)`
        : 'بدون تخفیف';
    case 'total':
      return formatAmount(purchase.total);
    case 'due':
      return purchase.due;
    case 'description':
      return purchase.description ? purchase.description : '—';
    case 'status':
      return purchase.status;
    default:
      return null;
  }
}

export type PurchasesPrintViewProps = {
  purchases: Purchase[];
  generatedAt: Date;
};

export function PurchasesPrintView({ purchases, generatedAt }: PurchasesPrintViewProps) {
  return (
    <div className="branches-print-report hidden bg-card text-foreground print:block">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1 text-start">
          <H1 className="text-start text-2xl font-bold tracking-tight sm:text-2xl">فاکتورهای خرید</H1>
          <P className="text-sm text-muted-foreground">خرید از تأمین‌کنندگان، تخفیف و بدهی‌های باز</P>
        </div>

        <div className="space-y-1 text-end">
          <Small className="block text-xs font-normal text-muted-foreground">
            تاریخ چاپ: {formatPrintTimestamp(generatedAt)}
          </Small>
          <Small className="block text-xs font-normal text-muted-foreground">
            تعداد فاکتورها: {formatCount(purchases.length)}
          </Small>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <Table className="w-full text-sm" aria-label="فاکتورهای خرید">
          <TableHeader className="bg-card">
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead
                key="row"
                className="h-11 px-3 text-center text-xs font-semibold text-foreground"
                style={{ width: PRINT_COLUMN_WIDTHS.row }}
              >
                ردیف
              </TableHead>

              {purchasesColumns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    'h-11 px-3 text-xs font-semibold text-foreground',
                    column.headerClassName,
                  )}
                  style={{ width: PRINT_COLUMN_WIDTHS[column.key ?? ''] }}
                >
                  {column.key === 'total' ? `${column.header} (ریال)` : column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {purchases.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={purchasesColumns.length + 1}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  فاکتور خریدی برای چاپ یافت نشد.
                </TableCell>
              </TableRow>
            ) : (
              purchases.map((purchase, index) => (
                <TableRow
                  key={purchase.id}
                  className="break-inside-avoid border-b border-border last:border-b-0 hover:bg-transparent"
                >
                  <TableCell className="px-3 py-3 text-center text-xs tabular-nums text-muted-foreground">
                    {formatCount(index + 1)}
                  </TableCell>

                  {purchasesColumns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        'px-3 py-3 align-middle',
                        column.className,
                      )}
                    >
                      {renderCell(purchase, column.key)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
