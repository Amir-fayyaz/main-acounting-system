'use client';

import type { ReactNode } from 'react';

import { DataTable, type DataTableColumn, type PaginationMeta } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

import type { Account } from '../../assets/@types/account.types';
import { ACCOUNT_PAGE_SIZES } from '../../lib/accounts.config';
import { formatCountFa, toPersianDigits } from '../../utils/format';
import { formatMoneyFa } from '../../utils/money';
import { AccountStatusBadge } from '../ui/AccountStatusBadge';
import { AccountTypeBadge } from '../ui/AccountTypeBadge';

const HEADER_CLASS = 'text-start text-xs font-semibold text-muted-foreground';
const EMPTY_VALUE = '—';

interface AccountsTableProps {
  data: Account[];
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

export function AccountsTable({
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
}: AccountsTableProps) {
  const columns = [
    {
      key: 'row',
      header: 'ردیف',
      headerClassName: cn(HEADER_CLASS, 'w-12'),
      className: 'w-12 text-xs tabular-nums text-muted-foreground',
      cell: (_account: Account, index: number) => formatCountFa((page - 1) * limit + index + 1),
    },
    {
      key: 'title',
      header: 'عنوان',
      headerClassName: HEADER_CLASS,
      className: 'max-w-56 text-foreground',
      cell: (account: Account) => (
        <span title={account.title} className="block truncate font-medium">
          {account.title}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'نوع',
      headerClassName: HEADER_CLASS,
      className: 'whitespace-nowrap',
      cell: (account: Account) => <AccountTypeBadge type={account.type} />,
    },
    {
      key: 'bank',
      header: 'بانک',
      headerClassName: HEADER_CLASS,
      className: 'whitespace-nowrap text-foreground',
      cell: (account: Account) => account.bank ?? EMPTY_VALUE,
    },
    {
      key: 'iban',
      header: 'شماره شبا',
      headerClassName: HEADER_CLASS,
      className: 'whitespace-nowrap text-xs tabular-nums text-muted-foreground',
      cell: (account: Account) =>
        account.iban ? (
          <span dir="ltr" className="inline-block text-start">
            {toPersianDigits(account.iban)}
          </span>
        ) : (
          EMPTY_VALUE
        ),
    },
    {
      key: 'branch',
      header: 'شعبه',
      headerClassName: HEADER_CLASS,
      className: 'whitespace-nowrap text-muted-foreground',
      cell: (account: Account) => account.branch ?? EMPTY_VALUE,
    },
    {
      key: 'balance',
      header: 'موجودی (ریال)',
      headerClassName: cn(HEADER_CLASS, 'text-end'),
      className: 'text-end tabular-nums',
      cell: (account: Account) => (
        <span className="whitespace-nowrap font-semibold text-foreground">
          {formatMoneyFa(account.balance.amount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      headerClassName: HEADER_CLASS,
      className: 'whitespace-nowrap',
      cell: (account: Account) => <AccountStatusBadge status={account.status} />,
    },
  ] satisfies DataTableColumn<Account>[];

  return (
    <DataTable<Account>
      aria-label="فهرست حساب‌های بانکی و صندوق‌ها"
      columns={columns}
      data={data}
      rowKey={(account) => account.id}
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
      pageSizes={[...ACCOUNT_PAGE_SIZES]}
      className="text-sm"
    />
  );
}
