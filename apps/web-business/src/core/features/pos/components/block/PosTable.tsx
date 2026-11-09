'use client';

import type { ReactNode } from 'react';

import { DataTable, type DataTableColumn, type PaginationMeta } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

import type { PosTerminal } from '../../assets/@types/pos-terminal.types';
import { POS_PAGE_SIZES } from '../../lib/pos.config';
import { formatFeePercentFa } from '../../utils/fee';
import {
  formatCountFa,
  formatIbanMaskFa,
  formatJalaliDateFa,
  toPersianDigits,
} from '../../utils/format';
import { PosStatusBadge } from '../ui/PosStatusBadge';

const HEADER_CLASS = 'text-start text-xs font-semibold text-muted-foreground';
const EMPTY_VALUE = '—';

interface PosTableProps {
  data: PosTerminal[];
  meta?: PaginationMeta;
  page: number;
  limit: number;
  loading: boolean;
  error?: ReactNode;
  searchTerm: string;
  emptyMessage: string;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function PosTable({
  data,
  meta,
  page,
  limit,
  loading,
  error,
  searchTerm,
  emptyMessage,
  onPageChange,
  onLimitChange,
}: PosTableProps) {
  const columns = [
    {
      key: 'row',
      header: 'ردیف',
      headerClassName: cn(HEADER_CLASS, 'w-12'),
      className: 'w-12 text-xs tabular-nums text-muted-foreground',
      cell: (_terminal: PosTerminal, index: number) =>
        formatCountFa((page - 1) * limit + index + 1),
    },
    {
      key: 'title',
      header: 'عنوان',
      headerClassName: HEADER_CLASS,
      className: 'max-w-48 text-foreground',
      cell: (terminal: PosTerminal) => (
        <span title={terminal.title} className="block truncate font-medium">
          {terminal.title}
        </span>
      ),
    },
    {
      key: 'terminalNumber',
      header: 'شماره ترمینال',
      headerClassName: HEADER_CLASS,
      className: 'whitespace-nowrap font-semibold tabular-nums text-foreground',
      cell: (terminal: PosTerminal) => toPersianDigits(terminal.terminalNumber),
    },
    {
      key: 'merchantNumber',
      header: 'شماره پذیرنده',
      headerClassName: HEADER_CLASS,
      className: 'whitespace-nowrap text-xs tabular-nums text-muted-foreground',
      cell: (terminal: PosTerminal) =>
        terminal.merchantNumber ? toPersianDigits(terminal.merchantNumber) : EMPTY_VALUE,
    },
    {
      key: 'bank',
      header: 'بانک',
      headerClassName: HEADER_CLASS,
      className: 'whitespace-nowrap text-foreground',
      cell: (terminal: PosTerminal) => terminal.bank ?? EMPTY_VALUE,
    },
    {
      key: 'feePercent',
      header: 'کارمزد',
      headerClassName: HEADER_CLASS,
      className: 'whitespace-nowrap tabular-nums text-foreground',
      cell: (terminal: PosTerminal) => formatFeePercentFa(terminal.feePercent),
    },
    {
      key: 'settlementIban',
      header: 'حساب مقصد',
      headerClassName: HEADER_CLASS,
      className: 'whitespace-nowrap text-xs tabular-nums text-muted-foreground',
      cell: (terminal: PosTerminal) => (
        <span dir="ltr" className="inline-block text-start">
          {formatIbanMaskFa(terminal.settlementIban)}
        </span>
      ),
    },
    {
      key: 'activatedOn',
      header: 'فعال‌سازی',
      headerClassName: HEADER_CLASS,
      className: 'whitespace-nowrap tabular-nums text-muted-foreground',
      cell: (terminal: PosTerminal) =>
        terminal.activatedOn ? formatJalaliDateFa(terminal.activatedOn) : EMPTY_VALUE,
    },
    {
      key: 'status',
      header: 'وضعیت',
      headerClassName: HEADER_CLASS,
      className: 'whitespace-nowrap',
      cell: (terminal: PosTerminal) => <PosStatusBadge status={terminal.status} />,
    },
  ] satisfies DataTableColumn<PosTerminal>[];

  return (
    <DataTable<PosTerminal>
      aria-label="فهرست دستگاه‌های POS"
      columns={columns}
      data={data}
      rowKey={(terminal) => terminal.id}
      loading={loading}
      error={error}
      searchTerm={searchTerm}
      emptyMessage={emptyMessage}
      searchEmptyMessage={`نتیجه‌ای برای «${searchTerm}» پیدا نشد. عبارت دیگری را جستجو کنید.`}
      meta={meta}
      page={page}
      limit={limit}
      onPageChange={onPageChange}
      onLimitChange={onLimitChange}
      pageSizes={[...POS_PAGE_SIZES]}
      className="text-sm"
    />
  );
}
