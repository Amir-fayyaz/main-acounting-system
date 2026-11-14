'use client';

import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button, DataTable, type DataTableColumn, type PaginationMeta } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

import type { Cheque } from '../../assets/@types/cheque.types';
import { CHEQUE_PAGE_SIZES } from '../../lib/checks.config';
import { formatCountFa, formatJalaliDateFa, toPersianDigits } from '../../utils/format';
import { formatMoneyFa } from '../../utils/money';
import { ChequeDirectionBadge } from '../ui/ChequeDirectionBadge';
import { ChequeStatusBadge } from '../ui/ChequeStatusBadge';

const HEADER_CLASS = 'text-start text-xs font-semibold text-muted-foreground';

interface ChecksTableProps {
  data: Cheque[];
  meta?: PaginationMeta;
  page: number;
  limit: number;
  loading: boolean;
  error?: ReactNode;
  searchTerm: string;
  emptyMessage: string;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onEdit: (cheque: Cheque) => void;
}

export function ChecksTable({
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
  onEdit,
}: ChecksTableProps) {
  const columns = [
    {
      key: 'row',
      header: 'ردیف',
      headerClassName: cn(HEADER_CLASS, 'w-12'),
      className: 'w-12 text-xs tabular-nums text-muted-foreground',
      cell: (_cheque: Cheque, index: number) => formatCountFa((page - 1) * limit + index + 1),
    },
    {
      key: 'number',
      header: 'شماره چک',
      headerClassName: HEADER_CLASS,
      className: 'font-semibold tabular-nums text-foreground',
      cell: (cheque: Cheque) => toPersianDigits(cheque.number),
    },
    {
      key: 'sayadId',
      header: 'شناسه صیادی',
      headerClassName: HEADER_CLASS,
      className: 'text-xs tabular-nums text-muted-foreground',
      cell: (cheque: Cheque) => (
        <span dir="ltr" className="inline-block text-start">
          {toPersianDigits(cheque.sayadId)}
        </span>
      ),
    },
    {
      key: 'direction',
      header: 'نوع',
      headerClassName: HEADER_CLASS,
      className: 'whitespace-nowrap',
      cell: (cheque: Cheque) => <ChequeDirectionBadge direction={cheque.direction} />,
    },
    {
      key: 'counterparty',
      header: 'طرف حساب',
      headerClassName: HEADER_CLASS,
      className: 'max-w-48 truncate text-foreground',
      cell: (cheque: Cheque) => (
        <span title={cheque.counterparty} className="block truncate">
          {cheque.counterparty}
        </span>
      ),
    },
    {
      key: 'bank',
      header: 'بانک',
      headerClassName: HEADER_CLASS,
      className: 'text-foreground',
      cell: (cheque: Cheque) => cheque.bank,
    },
    {
      key: 'amount',
      header: 'مبلغ',
      headerClassName: cn(HEADER_CLASS, 'text-end'),
      className: 'text-end tabular-nums',
      cell: (cheque: Cheque) => (
        <span className="whitespace-nowrap">
          <span className="font-semibold text-foreground">
            {formatMoneyFa(cheque.amount.amount)}
          </span>{' '}
          <span className="text-xs text-muted-foreground">ریال</span>
        </span>
      ),
    },
    {
      key: 'registeredDate',
      header: 'تاریخ ثبت',
      headerClassName: HEADER_CLASS,
      className: 'tabular-nums text-muted-foreground',
      cell: (cheque: Cheque) => formatJalaliDateFa(cheque.registeredDate),
    },
    {
      key: 'dueDate',
      header: 'تاریخ سررسید',
      headerClassName: HEADER_CLASS,
      className: 'tabular-nums text-muted-foreground',
      cell: (cheque: Cheque) => (
        <span
          className={cn(
            'whitespace-nowrap',
            cheque.status === 'overdue' && 'font-semibold text-destructive',
          )}
        >
          {formatJalaliDateFa(cheque.dueDate)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      headerClassName: HEADER_CLASS,
      className: 'whitespace-nowrap',
      cell: (cheque: Cheque) => <ChequeStatusBadge status={cheque.status} />,
    },
    {
      key: 'actions',
      header: 'عملیات',
      headerClassName: cn(HEADER_CLASS, 'w-20 print:hidden'),
      className: 'w-20 print:hidden',
      cell: (cheque: Cheque) => (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 px-2 text-xs"
          aria-label={`ویرایش چک ${toPersianDigits(cheque.number)}`}
          onClick={() => {
            onEdit(cheque);
          }}
        >
          <Pencil className="size-3.5" aria-hidden />
          ویرایش
        </Button>
      ),
    },
  ] satisfies DataTableColumn<Cheque>[];

  return (
    <DataTable<Cheque>
      aria-label="فهرست چک‌ها"
      columns={columns}
      data={data}
      rowKey={(cheque) => cheque.id}
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
      pageSizes={[...CHEQUE_PAGE_SIZES]}
      className="text-sm"
    />
  );
}
