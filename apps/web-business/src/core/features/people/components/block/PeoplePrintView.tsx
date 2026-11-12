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

import type { Person } from '../../assets/@types/person';
import { peopleColumns } from './PeopleTable';

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
  name: '18%',
  kind: '10%',
  phone: '14%',
  branch: '14%',
  recv: '19%',
  pay: '19%',
};

function formatCount(value: number): string {
  return PRINT_NUMBER_FORMATTER.format(value);
}

function formatAmount(value: string | number): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);

  return PRINT_NUMBER_FORMATTER.format(numericValue);
}

function renderCell(person: Person, key: string | undefined) {
  switch (key) {
    case 'name':
      return person.name;
    case 'kind':
      return person.kind;
    case 'phone':
      return person.phone;
    case 'branch':
      return person.branch;
    case 'recv':
      return formatAmount(person.recv);
    case 'pay':
      return formatAmount(person.pay);
    default:
      return null;
  }
}

export type PeoplePrintViewProps = {
  people: Person[];
  generatedAt: Date;
};

export function PeoplePrintView({ people, generatedAt }: PeoplePrintViewProps) {
  return (
    <div className="branches-print-report hidden bg-card text-foreground print:block">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1 text-start">
          <H1 className="text-start text-2xl font-bold tracking-tight sm:text-2xl">مشتریان و تأمین‌کنندگان</H1>
          <P className="text-sm text-muted-foreground">مانده حساب هر شخص</P>
        </div>

        <div className="space-y-1 text-end">
          <Small className="block text-xs font-normal text-muted-foreground">
            تاریخ چاپ: {formatPrintTimestamp(generatedAt)}
          </Small>
          <Small className="block text-xs font-normal text-muted-foreground">
            تعداد اشخاص: {formatCount(people.length)}
          </Small>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <Table className="w-full text-sm" aria-label="مشتریان و تأمین‌کنندگان">
          <TableHeader className="bg-card">
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead
                key="row"
                className="h-11 px-3 text-center text-xs font-semibold text-foreground"
                style={{ width: PRINT_COLUMN_WIDTHS.row }}
              >
                ردیف
              </TableHead>

              {peopleColumns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    'h-11 px-3 text-xs font-semibold text-foreground',
                    column.headerClassName,
                    column.key === 'recv' || column.key === 'pay' ? 'text-end' : undefined,
                  )}
                  style={{ width: PRINT_COLUMN_WIDTHS[column.key ?? ''] }}
                >
                  {column.key === 'recv' || column.key === 'pay'
                    ? `${column.header} (ریال)`
                    : column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {people.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={peopleColumns.length + 1}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  شخصی برای چاپ یافت نشد.
                </TableCell>
              </TableRow>
            ) : (
              people.map((person, index) => (
                <TableRow
                  key={person.id}
                  className="break-inside-avoid border-b border-border last:border-b-0 hover:bg-transparent"
                >
                  <TableCell className="px-3 py-3 text-center text-xs tabular-nums text-muted-foreground">
                    {formatCount(index + 1)}
                  </TableCell>

                  {peopleColumns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        'px-3 py-3 align-middle',
                        column.className,
                      )}
                    >
                      {renderCell(person, column.key)}
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
