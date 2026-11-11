'use client';

import { DataTable, type DataTableColumn, type PaginationMeta } from '@repo/web';

import type { Branch, Money } from '../../assets/@types/branch';
import { BranchStatusBadge } from '../ui/BranchStatusBadge';

export function formatMonthlySales(value: Money): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return value;

  const formatted = new Intl.NumberFormat('fa-IR', {
    maximumFractionDigits: 1,
  }).format(numericValue);

  if (numericValue >= 1e9) return `${formatted} میلیارد ریال`;
  if (numericValue >= 1e6) return `${formatted} میلیون ریال`;
  return `${formatted} ریال`;
}

export const branchesColumns: DataTableColumn<Branch>[] = [
  {
    key: 'code',
    header: 'کد',
    headerClassName: 'text-start',
    className: 'text-start font-mono text-sm text-muted-foreground',
  },
  {
    key: 'name',
    header: 'نام شعبه',
    headerClassName: 'text-start',
    className: 'text-start font-medium',
  },
  {
    key: 'managerName',
    header: 'مدیر',
    headerClassName: 'text-start',
    className: 'text-start text-muted-foreground',
  },
  {
    key: 'cashRegisterCount',
    header: 'صندوق‌ها',
    headerClassName: 'text-end',
    className: 'text-end tabular-nums',
  },
  {
    key: 'userCount',
    header: 'کاربران',
    headerClassName: 'text-end',
    className: 'text-end tabular-nums',
  },
  {
    key: 'monthlySales',
    header: 'فروش ماه',
    headerClassName: 'text-end',
    className: 'text-end font-medium tabular-nums',
    cell: (branch) => formatMonthlySales(branch.monthlySales),
  },
  {
    key: 'status',
    header: 'وضعیت',
    headerClassName: 'text-end',
    className: 'text-end',
    cell: (branch) => <BranchStatusBadge status={branch.status} />,
  },
];

export type BranchesTableProps = {
  data: Branch[];
  meta?: PaginationMeta;
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  loading?: boolean;
  error?: string;
  searchTerm?: string;
};

export function BranchesTable({
  data,
  meta,
  page,
  limit,
  onPageChange,
  onLimitChange,
  loading = false,
  error,
  searchTerm = '',
}: BranchesTableProps) {
  return (
    <DataTable<Branch>
      aria-label="شعب"
      columns={branchesColumns}
      data={data}
      rowKey={(branch) => branch.id}
      loading={loading}
      error={error}
      searchTerm={searchTerm}
      emptyMessage="هنوز شعبه‌ای ثبت نشده است."
      searchEmptyMessage={`نتیجه‌ای برای «${searchTerm}» پیدا نشد.`}
      meta={meta}
      page={page}
      limit={limit}
      onPageChange={onPageChange}
      onLimitChange={onLimitChange}
    />
  );
}
