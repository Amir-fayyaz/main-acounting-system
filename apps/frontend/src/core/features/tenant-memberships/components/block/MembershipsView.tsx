'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import {
  DataTable,
  SearchInput,
  usePagination,
  type DataTableColumn,
  type PaginationMeta,
} from '@repo/web';

import type { TenantMember, TenantMembershipsResult } from '../../assets/@types/membership.types';
import { filterMembersBySearch } from '../../utils/filter-members';
import { formatMemberDate } from '../../utils/format-member-date';
import { memberStatusLabel } from '../../utils/member-status-label';

export type MembershipsViewProps = {
  tenantId: string;
  /** Result of the server-side fetch for the current URL page/limit. */
  initialResult: TenantMembershipsResult;
};

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
    cell: (member) => memberStatusLabel(member.status),
  },
  {
    key: 'userStatus',
    header: 'وضعیت کاربر',
    cell: (member) => memberStatusLabel(member.userStatus),
  },
  {
    key: 'createdAt',
    header: 'تاریخ عضویت',
    cell: (member) => formatMemberDate(member.createdAt),
  },
];

/**
 * Client view: URL-synced pagination controls + optional client search filter.
 * Row data comes from the server (RSC); changing page/limit updates the URL and
 * re-runs the server page. Search is filtered locally and never sent to the API.
 */
export function MembershipsView({ initialResult }: MembershipsViewProps) {
  const { page, limit, setPage, setLimit } = usePagination();
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get('search') ?? '';

  const meta: PaginationMeta | undefined = initialResult.ok ? initialResult.result.meta : undefined;

  const filtered = useMemo(() => {
    const members = initialResult.ok ? initialResult.result.data : [];
    return filterMembersBySearch(members, searchTerm);
  }, [initialResult, searchTerm]);

  const errorContent = !initialResult.ok ? (
    <div className="grid gap-1">
      <p>{initialResult.message}</p>
      {initialResult.correlationId ? (
        <p className="text-xs text-muted-foreground">
          کد پیگیری: <span dir="ltr">{initialResult.correlationId}</span>
        </p>
      ) : null}
    </div>
  ) : undefined;

  return (
    <section className="grid gap-3">
      <div className="max-w-sm">
        <SearchInput title="جستجو در اعضای این صفحه…" />
      </div>

      <DataTable<TenantMember>
        aria-label="جدول اعضای مجموعه"
        columns={columns}
        data={filtered}
        rowKey={(member) => member.membershipId}
        error={errorContent}
        emptyMessage="هنوز عضوی برای این مجموعه ثبت نشده است."
        searchEmptyMessage="برای این جستجو نتیجه‌ای در صفحه فعلی یافت نشد."
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
