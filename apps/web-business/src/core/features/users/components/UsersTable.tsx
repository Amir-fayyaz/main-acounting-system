'use client';

import { Badge } from '@repo/web/ui/components/shadcn/ui/badge/badge';
import {
  DataTable,
  type DataTableColumn,
} from '@repo/web/ui/components/custom/ui/data-table';
import type { User } from '../assets/@types/user';
import { formatDate } from '@/core/utils/formatDate';

interface UsersTableProps {
  users: User[];
  loading?: boolean;
  error?: React.ReactNode;
  searchTerm?: string;
}

function roleBadge(role: User['role']) {
  switch (role) {
    case 'admin':
      return <Badge variant="destructive">مدیر سیستم</Badge>;
    case 'manager':
      return <Badge variant="secondary">مدیر</Badge>;
    case 'employee':
      return <Badge variant="outline">کارمند</Badge>;
    case 'viewer':
      return <Badge variant="outline">مشاهده‌گر</Badge>;
    default:
      return <Badge variant="outline">{role}</Badge>;
  }
}

function statusBadge(status: User['status']) {
  switch (status) {
    case 'active':
      return <Badge variant="success">فعال</Badge>;
    case 'inactive':
      return <Badge variant="outline">غیرفعال</Badge>;
    case 'pending':
      return <Badge variant="secondary">در انتظار تایید</Badge>;
    case 'suspended':
      return <Badge variant="destructive">موقوف</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatUserDate(dateString: string | undefined) {
  if (!dateString) return '—';
  return formatDate(new Date(dateString));
}

export function UsersTable({ users, loading, error, searchTerm }: UsersTableProps) {
  const columns: DataTableColumn<User>[] = [
    {
      header: 'نام کاربری',
      key: 'name',
      className: 'text-left',
      cell: (user) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{user.name}</span>
          <span className="text-xs text-muted-foreground">{user.email}</span>
        </div>
      ),
    },
    {
      header: 'نقش',
      key: 'role',
      className: 'text-right',
      cell: (user) => roleBadge(user.role),
    },
    {
      header: 'وضعیت',
      key: 'status',
      className: 'text-right',
      cell: (user) => statusBadge(user.status),
    },
    {
      header: 'تلفن',
      key: 'phone',
      className: 'text-left',
      cell: (user) => user.phone ?? '—',
    },
    {
      header: 'تاریخ عضویت',
      key: 'createdAt',
      className: 'text-right text-muted-foreground',
      cell: (user) => formatUserDate(user.createdAt),
    },
    {
      header: 'آخرین فعالیت',
      key: 'lastActiveAt',
      className: 'text-right text-muted-foreground',
      cell: (user) => formatUserDate(user.lastActiveAt),
    },
  ];

  return (
    <div data-slot="users-table" className="overflow-x-auto">
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        error={error}
        searchTerm={searchTerm}
        aria-label="لیست کاربران"
      />
    </div>
  );
}
