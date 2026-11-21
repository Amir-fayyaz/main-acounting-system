'use client';

import { DataTable, type DataTableColumn, type PaginationMeta } from '@repo/web';

import type { Branch } from '../../assets/@types/branch';
import { formatBranchAmount, formatBranchCode } from '../../utils/format';
import { BranchStatusBadge } from '../ui/BranchStatusBadge';

export const branchesColumns: DataTableColumn<Branch>[] = [
  {
    key: 'code',
    header: 'کد',
    headerClassName: 'text-start',
    className: 'text-start text-sm text-muted-foreground tabular-nums',
    cell: (branch) => formatBranchCode(branch.code),
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
    type: 'number',
  },
  {
    key: 'userCount',
    header: 'کاربران',
    headerClassName: 'text-end',
    className: 'text-end tabular-nums',
    type: 'number',
  },
  {
    key: 'monthlySales',
    header: 'فروش ماه (ریال)',
    headerClassName: 'text-end',
    className: 'text-end font-medium tabular-nums',
    cell: (branch) => formatBranchAmount(branch.monthlySales),
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
  search?: string;
  onSearchChange?: (search: string) => void;
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
  search = '',
  onSearchChange,
}: BranchesTableProps) {
  return (
    <DataTable<Branch>
      aria-label="شعب"
      columns={branchesColumns}
      data={data}
      rowKey={(branch) => branch.id}
      rowNumbers
      loading={loading}
      error={error}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="جستجو در شعب…"
      toolbar={{ search: true, columns: true, density: true }}
      searchTerm={search}
      emptyMessage="هنوز شعبه‌ای ثبت نشده است."
      searchEmptyMessage={`نتیجه‌ای برای «${search}» پیدا نشد.`}
      meta={meta}
      page={page}
      limit={limit}
      onPageChange={onPageChange}
      onLimitChange={onLimitChange}
    />
  );
}
