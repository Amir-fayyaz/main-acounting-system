'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import {
  DataTable,
  SearchInput,
  usePagination,
  type DataTableColumn,
  type PaginationMeta,
} from '@repo/web';

import { getTenantMemberships } from './actions';
import type { TenantMember, TenantMembershipsResult } from './actions';

type MembershipsTableProps = {
  tenantId: string;
};

type TableError = {
  message: string;
  correlationId?: string;
};

function statusLabel(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === 'active') return 'فعال';
  if (normalized === 'inactive') return 'غیرفعال';
  return status || '—';
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fa-IR');
}

const columns: DataTableColumn<TenantMember>[] = [
  {
    key: 'displayName',
    header: 'نام عضو',
    cell: (member) => member.displayName || '—',
  },
  {
    key: 'email',
    header: 'ایمیل',
    cell: (member) => (
      <span dir="ltr" className="inline-block">
        {member.email || '—'}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'وضعیت عضویت',
    cell: (member) => statusLabel(member.status),
  },
  {
    key: 'userStatus',
    header: 'وضعیت کاربر',
    cell: (member) => statusLabel(member.userStatus),
  },
  {
    key: 'createdAt',
    header: 'تاریخ عضویت',
    cell: (member) => formatDate(member.createdAt),
  },
];

export function MembershipsTable({ tenantId }: MembershipsTableProps) {
  const { page, limit, setPage, setLimit, queryParams } = usePagination();
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get('search') ?? '';

  const [members, setMembers] = useState<TenantMember[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<TableError | undefined>();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(undefined);

      const result: TenantMembershipsResult = await getTenantMemberships(
        tenantId,
        queryParams.page,
        queryParams.limit,
      );

      if (cancelled) return;

      if (result.ok) {
        setMembers(result.result.data);
        setMeta(result.result.meta);
      } else {
        setMembers([]);
        setMeta(undefined);
        setError({
          message: result.message,
          ...(result.correlationId
            ? { correlationId: result.correlationId }
            : {}),
        });
      }

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [tenantId, queryParams.page, queryParams.limit]);

  // The endpoint contract currently supports only page and limit, not search.
  // Until backend search is available, search filters the current server page only.
  const visibleMembers = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase();
    if (!query) return members;

    return members.filter((member) =>
      [member.displayName, member.email, member.membershipId, member.userId]
        .filter(Boolean)
        .some((value) => value.toLocaleLowerCase().includes(query)),
    );
  }, [members, searchTerm]);

  const errorContent = error ? (
    <div className="grid gap-1">
      <p>{error.message}</p>
      {error.correlationId ? (
        <p className="text-xs text-muted-foreground">
          کد پیگیری: <span dir="ltr">{error.correlationId}</span>
        </p>
      ) : null}
    </div>
  ) : undefined;

  return (
    <section className="grid gap-3">
      <div className="max-w-sm">
        <SearchInput title="جستجو در اعضای این صفحه..." />
      </div>

      <DataTable<TenantMember>
        aria-label="جدول اعضای مجموعه"
        columns={columns}
        data={visibleMembers}
        rowKey={(member) => member.membershipId}
        loading={loading}
        error={errorContent}
        emptyMessage="هنوز عضوی برای این مجموعه ثبت نشده است."
        searchEmptyMessage="برای این جستجو نتیجه‌ای یافت نشد."
        searchTerm={searchTerm}
        meta={meta}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        pageSizes={[10, 20, 50, 100]}
      />
    </section>
  );
}
