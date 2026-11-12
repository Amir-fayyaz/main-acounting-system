'use client';

import { DataTable, type DataTableColumn, type PaginationMeta } from '@repo/web';

import type { AuditEvent } from '../../assets/@types/audit';
import { AuditOutcomeBadge } from '../ui/AuditOutcomeBadge';

export const auditColumns: DataTableColumn<AuditEvent>[] = [
  {
    key: 'at',
    header: 'زمان',
    headerClassName: 'text-start',
    className: 'text-start text-muted-foreground tabular-nums',
  },
  {
    key: 'who',
    header: 'کاربر',
    headerClassName: 'text-start',
    className: 'text-start font-medium',
  },
  {
    key: 'action',
    header: 'عملیات',
    headerClassName: 'text-start',
    className: 'text-start text-muted-foreground tabular-nums',
  },
  {
    key: 'target',
    header: 'مورد',
    headerClassName: 'text-start',
    className: 'text-start text-muted-foreground',
  },
  {
    key: 'out',
    header: 'نتیجه',
    headerClassName: 'text-start',
    className: 'text-start',
    cell: (event) => <AuditOutcomeBadge outcome={event.out} />,
  },
];

export type AuditTableProps = {
  data: AuditEvent[];
  meta?: PaginationMeta;
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  loading?: boolean;
  error?: string;
  searchTerm?: string;
};

export function AuditTable({
  data,
  meta,
  page,
  limit,
  onPageChange,
  onLimitChange,
  loading = false,
  error,
  searchTerm = '',
}: AuditTableProps) {
  return (
    <DataTable<AuditEvent>
      aria-label="تاریخچه تغییرات"
      columns={auditColumns}
      data={data}
      rowKey={(event) => event.id}
      loading={loading}
      error={error}
      searchTerm={searchTerm}
      emptyMessage="هنوز رویدادی ثبت نشده است."
      searchEmptyMessage={`نتیجه‌ای برای «${searchTerm}» پیدا نشد.`}
      meta={meta}
      page={page}
      limit={limit}
      onPageChange={onPageChange}
      onLimitChange={onLimitChange}
    />
  );
}
