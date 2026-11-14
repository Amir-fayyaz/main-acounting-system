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

import type { AuditEvent } from '../../assets/@types/audit';
import { auditColumns } from './AuditTable';

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
  row: '6%',
  at: '20%',
  who: '14%',
  action: '16%',
  target: '30%',
  out: '14%',
};

function formatCount(value: number): string {
  return PRINT_NUMBER_FORMATTER.format(value);
}

function renderCell(event: AuditEvent, key: string | undefined) {
  switch (key) {
    case 'at':
      return event.at;
    case 'who':
      return event.who;
    case 'action':
      return event.action;
    case 'target':
      return event.target;
    case 'out':
      return event.out;
    default:
      return null;
  }
}

export type AuditPrintViewProps = {
  events: AuditEvent[];
  generatedAt: Date;
};

export function AuditPrintView({ events, generatedAt }: AuditPrintViewProps) {
  return (
    <div className="branches-print-report hidden bg-card text-foreground print:block">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1 text-start">
          <H1 className="text-start text-2xl font-bold tracking-tight sm:text-2xl">تاریخچه تغییرات</H1>
          <P className="text-sm text-muted-foreground">ثبت همه عملیات کاربران (غیرقابل ویرایش)</P>
        </div>

        <div className="space-y-1 text-end">
          <Small className="block text-xs font-normal text-muted-foreground">
            تاریخ چاپ: {formatPrintTimestamp(generatedAt)}
          </Small>
          <Small className="block text-xs font-normal text-muted-foreground">
            تعداد رویدادها: {formatCount(events.length)}
          </Small>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <Table className="w-full text-sm" aria-label="تاریخچه تغییرات">
          <TableHeader className="bg-card">
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead
                key="row"
                className="h-11 px-3 text-center text-xs font-semibold text-foreground"
                style={{ width: PRINT_COLUMN_WIDTHS.row }}
              >
                ردیف
              </TableHead>

              {auditColumns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    'h-11 px-3 text-xs font-semibold text-foreground',
                    column.headerClassName,
                  )}
                  style={{ width: PRINT_COLUMN_WIDTHS[column.key ?? ''] }}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {events.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={auditColumns.length + 1}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  رویدادی برای چاپ یافت نشد.
                </TableCell>
              </TableRow>
            ) : (
              events.map((event, index) => (
                <TableRow
                  key={event.id}
                  className="break-inside-avoid border-b border-border last:border-b-0 hover:bg-transparent"
                >
                  <TableCell className="px-3 py-3 text-center text-xs tabular-nums text-muted-foreground">
                    {formatCount(index + 1)}
                  </TableCell>

                  {auditColumns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        'px-3 py-3 align-middle',
                        column.className,
                      )}
                    >
                      {renderCell(event, column.key)}
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
