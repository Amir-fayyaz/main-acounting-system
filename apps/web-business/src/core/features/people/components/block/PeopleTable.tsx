'use client';

import {
  DataTable,
  type DataTableColumn,
  type PaginationMeta,
  type SortItem,
} from '@repo/web';

import type { Person } from '../../assets/@types/person';

function formatMoney(value: string): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return value;
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(numericValue);
}

export const peopleColumns: DataTableColumn<Person>[] = [
  {
    key: 'name',
    header: 'نام',
    headerClassName: 'text-start',
    className: 'text-start font-medium',
    sortable: true,
  },
  {
    key: 'kind',
    header: 'نوع',
    headerClassName: 'text-start',
    className: 'text-start text-muted-foreground',
    sortable: true,
  },
  {
    key: 'phone',
    header: 'تلفن',
    headerClassName: 'text-start',
    className: 'text-start text-muted-foreground tabular-nums',
    sortable: true,
  },
  {
    key: 'branch',
    header: 'شعبه',
    headerClassName: 'text-start',
    className: 'text-start text-muted-foreground',
    sortable: true,
  },
  {
    key: 'recv',
    header: 'مطالبات',
    headerClassName: 'text-end',
    className: 'text-end font-medium tabular-nums',
    type: 'money',
    currency: 'ریال',
    sortable: true,
    sortDescFirst: true,
    cell: (person) => formatMoney(person.recv),
  },
  {
    key: 'pay',
    header: 'بدهی',
    headerClassName: 'text-end',
    className: 'text-end font-medium tabular-nums',
    type: 'money',
    currency: 'ریال',
    sortable: true,
    sortDescFirst: true,
    cell: (person) => formatMoney(person.pay),
  },
];

export type PeopleTableProps = {
  data: Person[];
  meta?: PaginationMeta;
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  loading?: boolean;
  error?: string;
  search?: string;
  onSearchChange?: (search: string) => void;
  sorting?: SortItem[];
  onSortingChange?: (sorting: SortItem[]) => void;
};

export function PeopleTable({
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
  sorting,
  onSortingChange,
}: PeopleTableProps) {
  return (
    <DataTable<Person>
      aria-label="مشتریان و تأمین‌کنندگان"
      columns={peopleColumns}
      data={data}
      rowKey={(person) => person.id}
      rowNumbers
      loading={loading}
      error={error}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="جستجو در اشخاص…"
      toolbar={{ search: true, columns: true, density: true }}
      searchTerm={search}
      sorting={sorting}
      onSortingChange={onSortingChange}
      emptyMessage="هنوز شخصی ثبت نشده است."
      searchEmptyMessage={`نتیجه‌ای برای «${search}» پیدا نشد.`}
      meta={meta}
      page={page}
      limit={limit}
      onPageChange={onPageChange}
      onLimitChange={onLimitChange}
    />
  );
}
