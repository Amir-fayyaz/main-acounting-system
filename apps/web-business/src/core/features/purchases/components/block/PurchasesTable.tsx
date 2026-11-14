'use client';

import { DataTable, type DataTableColumn, type PaginationMeta } from '@repo/web';

import type { Purchase } from '../../assets/@types/purchase';
import { PurchaseStatusBadge } from '../ui/PurchaseStatusBadge';
import { formatMoney } from '../../utils/format';

export const purchasesColumns: DataTableColumn<Purchase>[] = [
  {
    key: 'no',
    header: 'شماره',
    headerClassName: 'text-start',
    className: 'text-start font-mono text-sm text-muted-foreground',
  },
  {
    key: 'supplier',
    header: 'تأمین‌کننده',
    headerClassName: 'text-start',
    className: 'text-start font-medium',
  },
  {
    key: 'date',
    header: 'تاریخ',
    headerClassName: 'text-start',
    className: 'text-start text-muted-foreground tabular-nums',
  },
  {
    key: 'discount',
    header: 'تخفیف',
    headerClassName: 'text-end',
    className: 'text-end tabular-nums',
    cell: (purchase) =>
      purchase.discount
        ? `${new Intl.NumberFormat('fa-IR').format(purchase.discount)} (${purchase.discountPercent}٪)`
        : 'بدون تخفیف',
  },
  {
    key: 'total',
    header: 'مبلغ نهایی (ریال)',
    headerClassName: 'text-end',
    className: 'text-end font-medium tabular-nums',
    cell: (purchase) => formatMoney(purchase.total),
  },
  {
    key: 'due',
    header: 'سررسید پرداخت',
    headerClassName: 'text-start',
    className: 'text-start text-muted-foreground tabular-nums',
  },
  {
    key: 'description',
    header: 'شرح',
    headerClassName: 'text-start',
    className: 'text-start text-muted-foreground',
    cell: (purchase) => (purchase.description ? purchase.description : '—'),
  },
  {
    key: 'status',
    header: 'وضعیت',
    headerClassName: 'text-end',
    className: 'text-end',
    cell: (purchase) => <PurchaseStatusBadge status={purchase.status} />,
  },
];

export type PurchasesTableProps = {
  data: Purchase[];
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

export function PurchasesTable({
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
}: PurchasesTableProps) {
  return (
    <DataTable<Purchase>
      aria-label="فاکتورهای خرید"
      columns={purchasesColumns}
      data={data}
      rowKey={(purchase) => purchase.id}
      rowNumbers
      loading={loading}
      error={error}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="جستجو در خریدها…"
      toolbar={{ search: true, columns: true, density: true }}
      searchTerm={search}
      emptyMessage="هنوز فاکتور خریدی ثبت نشده است."
      searchEmptyMessage={`نتیجه‌ای برای «${search}» پیدا نشد.`}
      meta={meta}
      page={page}
      limit={limit}
      onPageChange={onPageChange}
      onLimitChange={onLimitChange}
    />
  );
}
