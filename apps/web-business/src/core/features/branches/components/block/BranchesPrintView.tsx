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

import type { Branch } from '../../assets/@types/branch';
import { BRANCH_STATUS_LABELS } from '../ui/BranchStatusBadge';
import { branchesColumns } from './BranchesTable';

const PRINT_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('fa-IR', {
  calendar: 'persian',
  dateStyle: 'full',
  timeStyle: 'short',
});

const PRINT_NUMBER_FORMATTER = new Intl.NumberFormat('fa-IR');
const PRINT_PLAIN_NUMBER_FORMATTER = new Intl.NumberFormat('fa-IR', {
  useGrouping: false,
});

export function formatPrintTimestamp(date: Date): string {
  return PRINT_DATE_TIME_FORMATTER.format(date);
}

const PRINT_COLUMN_WIDTHS: Record<string, string> = {
  row: '7%',
  code: '8%',
  name: '20%',
  managerName: '18%',
  cashRegisterCount: '9%',
  userCount: '9%',
  monthlySales: '18%',
  status: '11%',
};

function formatCount(value: number): string {
  return PRINT_NUMBER_FORMATTER.format(value);
}

function formatAmount(value: string): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return value;

  return PRINT_NUMBER_FORMATTER.format(numericValue);
}

function formatCode(value: string): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return value;

  return PRINT_PLAIN_NUMBER_FORMATTER.format(numericValue);
}

function renderCell(branch: Branch, key: string | undefined) {
  switch (key) {
    case 'code':
      return formatCode(branch.code);
    case 'name':
      return branch.name;
    case 'managerName':
      return branch.managerName;
    case 'cashRegisterCount':
      return formatCount(branch.cashRegisterCount);
    case 'userCount':
      return formatCount(branch.userCount);
    case 'monthlySales':
      return formatAmount(branch.monthlySales);
    case 'status':
      return (
        <span
          className={cn(
            'font-medium',
            branch.status === 'active' ? 'text-green-700' : 'text-muted-foreground',
          )}
        >
          {BRANCH_STATUS_LABELS[branch.status]}
        </span>
      );
    default:
      return null;
  }
}

export type BranchesPrintViewProps = {
  branches: Branch[];
  generatedAt: Date;
};

export function BranchesPrintView({ branches, generatedAt }: BranchesPrintViewProps) {
  return (
    <div className="branches-print-report hidden bg-card text-foreground print:block">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1 text-start">
          <H1 className="text-start text-2xl font-bold tracking-tight sm:text-2xl">شعب</H1>
          <P className="text-sm text-muted-foreground">ساختار سازمانی و عملکرد هر شعبه</P>
        </div>

        <div className="space-y-1 text-end">
          <Small className="block text-xs font-normal text-muted-foreground">
            تاریخ چاپ: {formatPrintTimestamp(generatedAt)}
          </Small>
          <Small className="block text-xs font-normal text-muted-foreground">
            تعداد شعب: {formatCount(branches.length)}
          </Small>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <Table className="w-full text-sm" aria-label="شعب">
          <TableHeader className="bg-card">
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead
                key="row"
                className="h-11 px-3 text-center text-xs font-semibold text-foreground"
                style={{ width: PRINT_COLUMN_WIDTHS.row }}
              >
                ردیف
              </TableHead>

              {branchesColumns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    'h-11 px-3 text-xs font-semibold text-foreground',
                    column.headerClassName,
                    column.key === 'status' && 'text-center',
                  )}
                  style={{ width: PRINT_COLUMN_WIDTHS[column.key ?? ''] }}
                >
                  {column.key === 'monthlySales' ? `${column.header} (ریال)` : column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {branches.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={branchesColumns.length + 1}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  شعبه‌ای برای چاپ یافت نشد.
                </TableCell>
              </TableRow>
            ) : (
              branches.map((branch, index) => (
                <TableRow
                  key={branch.id}
                  className="break-inside-avoid border-b border-border last:border-b-0 hover:bg-transparent"
                >
                  <TableCell className="px-3 py-3 text-center text-xs tabular-nums text-muted-foreground">
                    {formatCount(index + 1)}
                  </TableCell>

                  {branchesColumns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        'px-3 py-3 align-middle',
                        column.className,
                        column.key === 'status' && 'text-center',
                      )}
                    >
                      {renderCell(branch, column.key)}
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
