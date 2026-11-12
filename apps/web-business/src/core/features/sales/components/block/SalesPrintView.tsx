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

import type { Sale } from '../../assets/@types/sale';
import { salesColumns } from './SalesTable';

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
  row: '4%',
  no: '7%',
  cust: '12%',
  seller: '9%',
  date: '8%',
  disc: '8%',
  total: '9%',
  paid: '9%',
  rest: '9%',
  comm: '8%',
  desc: '10%',
  status: '6%',
};

function formatCount(value: number): string {
  return PRINT_NUMBER_FORMATTER.format(value);
}

function formatAmount(value: string | number): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);

  return PRINT_NUMBER_FORMATTER.format(numericValue);
}

function renderCell(sale: Sale, key: string | undefined) {
  switch (key) {
    case 'no':
      return sale.no;
    case 'cust':
      return sale.cust;
    case 'seller':
      return sale.seller;
    case 'date':
      return sale.date;
    case 'disc':
      return formatAmount(sale.disc);
    case 'total':
      return formatAmount(sale.total);
    case 'paid':
      return formatAmount(sale.paid);
    case 'rest':
      return formatAmount(Number(sale.total) - Number(sale.paid));
    case 'comm':
      return formatAmount(sale.comm);
    case 'desc':
      return sale.desc ? sale.desc : '—';
    case 'status':
      return sale.status;
    default:
      return null;
  }
}

export type SalesPrintViewProps = {
  sales: Sale[];
  generatedAt: Date;
};

export function SalesPrintView({ sales, generatedAt }: SalesPrintViewProps) {
  return (
    <div className="branches-print-report hidden bg-card text-foreground print:block">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1 text-start">
          <H1 className="text-start text-2xl font-bold tracking-tight sm:text-2xl">فاکتورهای فروش</H1>
          <P className="text-sm text-muted-foreground">
            فاکتورها، تخفیف، فروشنده و پورسانت، پرداخت‌ها و مانده هر فاکتور
          </P>
        </div>

        <div className="space-y-1 text-end">
          <Small className="block text-xs font-normal text-muted-foreground">
            تاریخ چاپ: {formatPrintTimestamp(generatedAt)}
          </Small>
          <Small className="block text-xs font-normal text-muted-foreground">
            تعداد فاکتورها: {formatCount(sales.length)}
          </Small>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <Table className="w-full text-sm" aria-label="فاکتورهای فروش">
          <TableHeader className="bg-card">
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead
                key="row"
                className="h-11 px-3 text-center text-xs font-semibold text-foreground"
                style={{ width: PRINT_COLUMN_WIDTHS.row }}
              >
                ردیف
              </TableHead>

              {salesColumns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    'h-11 px-3 text-xs font-semibold text-foreground',
                    column.headerClassName,
                  )}
                  style={{ width: PRINT_COLUMN_WIDTHS[column.key ?? ''] }}
                >
                  {column.key === 'total' || column.key === 'disc' || column.key === 'paid' || column.key === 'rest' || column.key === 'comm'
                    ? `${column.header} (ریال)`
                    : column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {sales.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={salesColumns.length + 1}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  فاکتوری برای چاپ یافت نشد.
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale, index) => (
                <TableRow
                  key={sale.id}
                  className="break-inside-avoid border-b border-border last:border-b-0 hover:bg-transparent"
                >
                  <TableCell className="px-3 py-3 text-center text-xs tabular-nums text-muted-foreground">
                    {formatCount(index + 1)}
                  </TableCell>

                  {salesColumns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        'px-3 py-3 align-middle',
                        column.className,
                      )}
                    >
                      {renderCell(sale, column.key)}
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
