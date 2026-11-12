'use client';

import { useEffect, useState } from 'react';
import { usePagination } from '@repo/web';
import { Button, H1, P, SectionLayout } from '@repo/web';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';

import type { AuditEvent } from '../../assets/@types/audit';
import { useAudit } from '../../hook/useAudit';
import { useAuditFilters } from '../../hook/useAuditFilters';
import { AuditToolbar } from '../ui/AuditToolbar';
import { AuditTable } from './AuditTable';
import { AuditPrintView } from './AuditPrintView';
import { listAllAudit } from '../../lib/audit.service';

type PrintSnapshot = {
  events: AuditEvent[];
  generatedAt: Date;
};

const PRINT_ERROR_MESSAGE = 'آماده‌سازی گزارش چاپ با مشکل مواجه شد. لطفاً دوباره تلاش کنید.';

export function AuditPage() {
  const { page, limit, setPage, setLimit, queryParams } = usePagination();
  const { outcome, search, setOutcome, setSearch } = useAuditFilters();

  const { state } = useAudit({ ...queryParams, search, outcome });

  const [printSnapshot, setPrintSnapshot] = useState<PrintSnapshot | null>(null);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);

  useEffect(() => {
    if (!printSnapshot) return;

    function handleAfterPrint() {
      setPrintSnapshot(null);
    }

    window.addEventListener('afterprint', handleAfterPrint);
    const frame = requestAnimationFrame(() => {
      window.print();
    });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [printSnapshot]);

  const isLoading = state.status === 'loading';
  const response = state.status === 'success' ? state.response : undefined;
  const errorMessage =
    state.status === 'error'
      ? 'دریافت تاریخچه تغییرات با مشکل مواجه شد. لطفاً دوباره تلاش کنید.'
      : undefined;

  async function handlePrint() {
    if (isPreparingPrint) return;

    setIsPreparingPrint(true);
    try {
      const events = await listAllAudit({ search, outcome });
      setPrintSnapshot({ events, generatedAt: new Date() });
    } catch {
      toast.error(PRINT_ERROR_MESSAGE);
    } finally {
      setIsPreparingPrint(false);
    }
  }

  return (
    <SectionLayout>
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div className="space-y-1">
          <H1 className="text-start text-xl font-bold sm:text-2xl">تاریخچه تغییرات</H1>
          <P className="text-sm text-muted-foreground">ثبت همه عملیات کاربران (غیرقابل ویرایش)</P>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={isPreparingPrint}
          >
            <Printer className="size-4" aria-hidden="true" />
            {isPreparingPrint ? 'در حال آماده‌سازی…' : 'چاپ'}
          </Button>
        </div>
      </div>

      <AuditToolbar outcome={outcome} onOutcomeChange={setOutcome} className="print:hidden" />

      <div className="print:hidden">
        <AuditTable
          data={response?.data ?? []}
          meta={response?.meta}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
          loading={isLoading}
          error={errorMessage}
          search={search}
          onSearchChange={setSearch}
        />
      </div>

      {printSnapshot ? (
        <AuditPrintView
          events={printSnapshot.events}
          generatedAt={printSnapshot.generatedAt}
        />
      ) : null}
    </SectionLayout>
  );
}
