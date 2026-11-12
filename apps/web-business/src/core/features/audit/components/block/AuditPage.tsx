'use client';

import { usePagination } from '@repo/web';
import { H1, P, SectionLayout } from '@repo/web';
import { useSearchParams } from 'next/navigation';

import { useAudit } from '../../hook/useAudit';
import { useAuditFilters } from '../../hook/useAuditFilters';
import { AuditToolbar } from '../ui/AuditToolbar';
import { AuditTable } from './AuditTable';

export function AuditPage() {
  const { page, limit, setPage, setLimit, queryParams } = usePagination();
  const searchParams = useSearchParams();
  const { outcome, setOutcome } = useAuditFilters();

  const search = searchParams.get('search') ?? '';

  const { state } = useAudit({ ...queryParams, search, outcome });

  const isLoading = state.status === 'loading';
  const response = state.status === 'success' ? state.response : undefined;
  const errorMessage =
    state.status === 'error'
      ? 'دریافت تاریخچه تغییرات با مشکل مواجه شد. لطفاً دوباره تلاش کنید.'
      : undefined;

  return (
    <SectionLayout>
      <div className="space-y-1">
        <H1 className="text-start text-xl font-bold sm:text-2xl">تاریخچه تغییرات</H1>
        <P className="text-sm text-muted-foreground">ثبت همه عملیات کاربران (غیرقابل ویرایش)</P>
      </div>

      <AuditToolbar outcome={outcome} onOutcomeChange={setOutcome} />

      <AuditTable
        data={response?.data ?? []}
        meta={response?.meta}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        loading={isLoading}
        error={errorMessage}
        searchTerm={search}
      />
    </SectionLayout>
  );
}
