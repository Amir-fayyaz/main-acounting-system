'use client';

import { DataTable, type DataTableColumn, type PaginationMeta } from '@repo/web';

import type { Sale } from '../../assets/@types/sale';
import { SaleStatusBadge } from '../ui/SaleStatusBadge';
import { formatMoney } from '../../utils/format';

export const salesColumns: DataTableColumn<Sale>[] = [
  {
    key: 'no',
    header: 'شماره',
    headerClassName: 'text-start',
    className: 'text-start font-medium tabular-nums',
  },
  {
    key: 'cust',
    header: 'مشتری',
    headerClassName: 'text-start',
    className: 'text-start',
  },
  {
    key: 'seller',
    header: 'فروشنده',
    headerClassName: 'text-start',
    className: 'text-start text-muted-foreground',
  },
  {
    key: 'date',
    header: 'تاریخ',
    headerClassName: 'text-start',
    className: 'text-start text-muted-foreground tabular-nums',
  },
  {
    key: 'disc',
    header: 'تخفیف',
    headerClassName: 'text-end',
    className: 'text-end tabular-nums',
    cell: (sale) => formatMoney(sale.disc),
  },
  {
    key: 'total',
    header: 'مبلغ نهایی (ریال)',
    headerClassName: 'text-end',
    className: 'text-end font-medium tabular-nums',
    cell: (sale) => formatMoney(sale.total),
  },
  {
    key: 'paid',
    header: 'پرداخت‌شده',
    headerClassName: 'text-end',
    className: 'text-end tabular-nums',
    cell: (sale) => formatMoney(sale.paid),
  },
  {
    key: 'rest',
    header: 'مانده',
    headerClassName: 'text-end',
    className: 'text-end tabular-nums',
    cell: (sale) => formatMoney(Number(sale.total) - Number(sale.paid)),
  },
  {
    key: 'comm',
    header: 'پورسانت (ریال)',
    headerClassName: 'text-end',
    className: 'text-end tabular-nums',
    cell: (sale) => formatMoney(sale.comm),
  },
  {
    key: 'desc',
    header: 'شرح',
    headerClassName: 'text-start',
    className: 'text-start text-muted-foreground',
  },
  {
    key: 'status',
    header: 'وضعیت',
    headerClassName: 'text-start',
    className: 'text-start',
    cell: (sale) => <SaleStatusBadge status={sale.status} />,
  },
];

export type SalesTableProps = {
  data: Sale[];
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

export function SalesTable({
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
}: SalesTableProps) {
  return (
    <DataTable<Sale>
      aria-label="فاکتورهای فروش"
      columns={salesColumns}
      data={data}
      rowKey={(sale) => sale.id}
      rowNumbers
      loading={loading}
      error={error}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="جستجو در فاکتورها…"
      toolbar={{ search: true, columns: true, density: true }}
      searchTerm={search}
      emptyMessage="هنوز فاکتوری ثبت نشده است."
      searchEmptyMessage={`نتیجه‌ای برای «${search}» پیدا نشد.`}
      meta={meta}
      page={page}
      limit={limit}
      onPageChange={onPageChange}
      onLimitChange={onLimitChange}
    />
  );
}
