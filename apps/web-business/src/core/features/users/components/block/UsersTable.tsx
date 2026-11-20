'use client';

import { DataTable, type DataTableColumn, type PaginationMeta } from '@repo/web';

import type { User } from '../../assets/@types/user';
import { UserStatusBadge } from '../ui/UserStatusBadge';

export const usersColumns: DataTableColumn<User>[] = [
  {
    key: 'name',
    header: 'نام',
    headerClassName: 'text-start',
    className: 'text-start font-medium',
  },
  {
    key: 'email',
    header: 'ایمیل',
    headerClassName: 'text-start',
    className: 'text-start text-muted-foreground ltr:text-left',
  },
  {
    key: 'role',
    header: 'نقش',
    headerClassName: 'text-start',
    className: 'text-start text-muted-foreground',
  },
  {
    key: 'branch',
    header: 'شعبه',
    headerClassName: 'text-start',
    className: 'text-start text-muted-foreground',
  },
  {
    key: 'status',
    header: 'وضعیت',
    headerClassName: 'text-end',
    className: 'text-end',
    cell: (user) => <UserStatusBadge status={user.status} />,
  },
];

export type UsersTableProps = {
  data: User[];
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

export function UsersTable({
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
}: UsersTableProps) {
  return (
    <DataTable<User>
      aria-label="کاربران و نقش‌ها"
      columns={usersColumns}
      data={data}
      rowKey={(user) => user.id}
      rowNumbers
      loading={loading}
      error={error}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="جستجو در کاربران…"
      toolbar={{ search: true, columns: true, density: true }}
      searchTerm={search}
      emptyMessage="هنوز کاربری ثبت نشده است."
      searchEmptyMessage={`نتیجه‌ای برای «${search}» پیدا نشد.`}
      meta={meta}
      page={page}
      limit={limit}
      onPageChange={onPageChange}
      onLimitChange={onLimitChange}
    />
  );
}
