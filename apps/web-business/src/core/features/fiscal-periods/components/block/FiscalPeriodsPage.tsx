'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CiCircleInfo, CiCirclePlus } from 'react-icons/ci';
import { toast } from 'sonner';

import { Button, SectionLayout } from '@repo/web';
import { PageHeader } from '../../../panel/components/ui/PageHeader';

import type { FiscalPeriod } from '../../assets/@types';
import { useFiscalStore } from '../../store/useFiscalStore';
import { mapFiscalErrorMessage } from '../../lib/fiscal-api';
import { ClosePeriodDialog } from '../ui/ClosePeriodDialog';
import { FiscalAuditTrailCard } from '../ui/FiscalAuditTrailCard';
import { FiscalPeriodsStats } from '../ui/FiscalPeriodsStats';
import { FiscalPeriodsTable } from '../ui/FiscalPeriodsTable';
import { FiscalYearToolbar } from '../ui/FiscalYearToolbar';
import { NewPeriodDialog } from '../ui/NewPeriodDialog';
import { ReopenPeriodDialog } from '../ui/ReopenPeriodDialog';

export function FiscalPeriodsPage() {
  const searchParams = useSearchParams();
  const yearQueryParam = searchParams?.get('year');

  const {
    years,
    selectedYearId,
    periods,
    stats,
    auditLogs,
    loading,
    loadYears,
    setSelectedYearId,
    createPeriod,
    generateMonthlyPeriods,
    selectActivePeriod,
    updatePeriodStatus,
  } = useFiscalStore();

  // Dialog states
  const [closingPeriod, setClosingPeriod] = useState<FiscalPeriod | null>(null);
  const [reopeningPeriod, setReopeningPeriod] = useState<FiscalPeriod | null>(null);
  const [isNewPeriodOpen, setIsNewPeriodOpen] = useState(false);

  // Load initial fiscal years and handle query param
  useEffect(() => {
    loadYears(true).then((list) => {
      if (yearQueryParam && list.some((y) => y.id === yearQueryParam)) {
        setSelectedYearId(yearQueryParam);
      }
    });
  }, [loadYears, setSelectedYearId, yearQueryParam]);

  const selectedYear = years.find((y) => y.id === selectedYearId) ?? null;

  const handleSelectActive = async (period: FiscalPeriod) => {
    try {
      await selectActivePeriod(period.id, { syncWithApi: true });
      toast.success(`دوره‌ی «${period.name}» به عنوان دوره‌ی مالی فعال انتخاب شد`);
    } catch (error) {
      toast.error(mapFiscalErrorMessage(error));
    }
  };

  const handleStartReview = async (period: FiscalPeriod) => {
    try {
      await updatePeriodStatus(period.id, 'review');
      toast.info(`دوره‌ی ${period.name} در وضعیت بازبینی قرار گرفت`);
    } catch (error) {
      toast.error(mapFiscalErrorMessage(error));
    }
  };

  const handleRevertToOpen = async (period: FiscalPeriod) => {
    try {
      await updatePeriodStatus(period.id, 'open');
      toast.success(`دوره‌ی ${period.name} باز شد`);
    } catch (error) {
      toast.error(mapFiscalErrorMessage(error));
    }
  };

  const handleConfirmClose = async (period: FiscalPeriod) => {
    try {
      await updatePeriodStatus(period.id, 'closed', '', { syncWithApi: true });
      toast.success(`دوره‌ی ${period.name} بسته شد`);
    } catch (error) {
      toast.error(mapFiscalErrorMessage(error));
    }
  };

  const handleConfirmReopen = async (period: FiscalPeriod, reason: string) => {
    try {
      await updatePeriodStatus(period.id, 'reopened', reason, { syncWithApi: true });
      toast.success(`دوره‌ی ${period.name} بازگشایی شد و در ممیزی ثبت گردید`);
    } catch (error) {
      toast.error(mapFiscalErrorMessage(error));
    }
  };

  const handleCreatePeriod = async (periodData: Omit<FiscalPeriod, 'id'>) => {
    try {
      await createPeriod(periodData);
      toast.success('دوره‌ی جدید ایجاد شد');
    } catch (error) {
      toast.error(mapFiscalErrorMessage(error, 'خطا در ایجاد دوره'));
    }
  };

  const handleGeneratePeriods = async () => {
    if (!selectedYearId) return;
    try {
      await generateMonthlyPeriods(selectedYearId);
      toast.success('۱۲ دوره‌ی ماهانه با موفقیت ایجاد شدند');
    } catch (error) {
      toast.error(mapFiscalErrorMessage(error, 'خطا در تولید دوره‌ها'));
    }
  };

  return (
    <SectionLayout>
      <PageHeader
        title="دوره‌های مالی"
        description="ایجاد، باز و بسته کردن دوره‌ها؛ ثبت فقط در دوره‌ی باز مجاز است"
        actions={
          <Button size="sm" onClick={() => setIsNewPeriodOpen(true)} disabled={!selectedYear}>
            <CiCirclePlus className="size-4 me-1.5" />
            ایجاد دوره
          </Button>
        }
      />

      <div className="grid gap-6">
        <FiscalYearToolbar
          years={years}
          selectedYearId={selectedYearId}
          selectedYear={selectedYear}
          onSelectYear={setSelectedYearId}
        />

        <FiscalPeriodsStats stats={stats} />

        <div className="flex items-start gap-2.5 p-3 rounded-md bg-muted/60 text-muted-foreground border border-border text-sm">
          <CiCircleInfo className="size-4 shrink-0 mt-0.5" />
          <span>
            ثبت سند، فاکتور، دریافت و پرداخت فقط در دوره‌های «باز» و «بازگشایی‌شده» انجام می‌شود. در
            دوره‌ی «در بازبینی» ثبت جدید متوقف است.
          </span>
        </div>

        <FiscalPeriodsTable
          loading={loading}
          periods={periods}
          onGeneratePeriods={handleGeneratePeriods}
          onOpenNewPeriod={() => setIsNewPeriodOpen(true)}
          onStartReview={handleStartReview}
          onRevertToOpen={handleRevertToOpen}
          onSelectClosePeriod={setClosingPeriod}
          onSelectReopenPeriod={setReopeningPeriod}
          onSelectActivePeriod={handleSelectActive}
        />

        <FiscalAuditTrailCard auditLogs={auditLogs} />
      </div>

      <ClosePeriodDialog
        period={closingPeriod}
        open={closingPeriod !== null}
        onOpenChange={(open) => !open && setClosingPeriod(null)}
        onConfirm={handleConfirmClose}
      />

      <ReopenPeriodDialog
        period={reopeningPeriod}
        open={reopeningPeriod !== null}
        onOpenChange={(open) => !open && setReopeningPeriod(null)}
        onConfirm={handleConfirmReopen}
      />

      <NewPeriodDialog
        year={selectedYear}
        open={isNewPeriodOpen}
        onOpenChange={setIsNewPeriodOpen}
        onConfirm={handleCreatePeriod}
      />
    </SectionLayout>
  );
}
