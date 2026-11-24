'use client';

import { useState } from 'react';
import { CiCircleInfo, CiCirclePlus, CiRedo } from 'react-icons/ci';
import { toast } from 'sonner';

import { Button, Card, CardContent, SectionLayout } from '@repo/web';
import { PageHeader } from '../../../panel/components/ui/PageHeader';

import type { FiscalPeriod } from '../../assets/@types';
import { useFiscalPeriods } from '../../hook/useFiscalPeriods';
import { ClosePeriodDialog } from '../ui/ClosePeriodDialog';
import { FiscalAuditTrailCard } from '../ui/FiscalAuditTrailCard';
import { FiscalPeriodsStats } from '../ui/FiscalPeriodsStats';
import { FiscalPeriodsTable } from '../ui/FiscalPeriodsTable';
import { FiscalYearToolbar } from '../ui/FiscalYearToolbar';
import { NewPeriodDialog } from '../ui/NewPeriodDialog';
import { ReopenPeriodDialog } from '../ui/ReopenPeriodDialog';

export function FiscalPeriodsPage() {
  const {
    years,
    selectedYearId,
    selectedYear,
    periods,
    stats,
    auditLogs,
    loading,
    errorMessage,
    selectYear,
    reload,
    closePeriod,
    reopenPeriod,
    createPeriod,
    generatePeriods,
    startReview,
    revertToOpen,
  } = useFiscalPeriods();

  const [closingPeriod, setClosingPeriod] = useState<FiscalPeriod | null>(null);
  const [reopeningPeriod, setReopeningPeriod] = useState<FiscalPeriod | null>(null);
  const [isNewPeriodOpen, setIsNewPeriodOpen] = useState(false);

  const handleStartReview = async (period: FiscalPeriod) => {
    const outcome = await startReview(period);
    if (!outcome.ok) {
      toast.error(outcome.message);
      return;
    }

    toast.info(`دوره‌ی ${period.name} در وضعیت بازبینی قرار گرفت`);
  };

  const handleRevertToOpen = async (period: FiscalPeriod) => {
    const outcome = await revertToOpen(period);
    if (!outcome.ok) {
      toast.error(outcome.message);
      return;
    }

    toast.success(`دوره‌ی ${period.name} باز شد`);
  };

  const handleConfirmClose = async (period: FiscalPeriod): Promise<boolean> => {
    const outcome = await closePeriod(period);
    if (!outcome.ok) {
      toast.error(outcome.message);
      return false;
    }

    toast.success(`دوره‌ی ${period.name} بسته شد`);

    return true;
  };

  const handleConfirmReopen = async (period: FiscalPeriod, reason: string): Promise<boolean> => {
    const outcome = await reopenPeriod(period, reason);
    if (!outcome.ok) {
      toast.error(outcome.message);
      return false;
    }

    toast.success(`دوره‌ی ${period.name} بازگشایی شد و در ممیزی ثبت گردید`);

    return true;
  };

  const handleCreatePeriod = async (periodData: Omit<FiscalPeriod, 'id'>) => {
    const outcome = await createPeriod(periodData);
    if (!outcome.ok) {
      toast.error(outcome.message);
      return;
    }

    toast.success('دوره‌ی جدید ایجاد شد');
  };

  const handleGeneratePeriods = async () => {
    const outcome = await generatePeriods();
    if (!outcome.ok) {
      toast.error(outcome.message);
      return;
    }

    toast.success('۱۲ دوره‌ی ماهانه با موفقیت ایجاد شدند');
  };

  const hasYears = years.length > 0;

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
        {errorMessage !== null ? (
          <Card>
            <CardContent className="pt-6 space-y-3">
              <p className="text-sm text-destructive">{errorMessage}</p>
              <Button variant="outline" size="sm" onClick={reload}>
                <CiRedo className="size-3.5 me-1.5" />
                تلاش دوباره
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {errorMessage === null && !loading && !hasYears ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              برای این شرکت هنوز سال مالی ثبت نشده است؛ پس از ایجاد سال مالی، دوره‌های ماهانه‌ی آن
              به‌صورت خودکار ساخته می‌شوند.
            </CardContent>
          </Card>
        ) : null}

        {errorMessage === null && (loading || hasYears) ? (
          <>
            <FiscalYearToolbar
              years={years}
              selectedYearId={selectedYearId}
              selectedYear={selectedYear}
              onSelectYear={selectYear}
            />

            <FiscalPeriodsStats stats={stats} />

            <div className="flex items-start gap-2.5 p-3 rounded-md bg-muted/60 text-muted-foreground border border-border text-sm">
              <CiCircleInfo className="size-4 shrink-0 mt-0.5" />
              <span>
                ثبت سند، فاکتور، دریافت و پرداخت فقط در دوره‌های «باز» و «بازگشایی‌شده» انجام
                می‌شود. در دوره‌ی «در بازبینی» ثبت جدید متوقف است.
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
            />

            <FiscalAuditTrailCard auditLogs={auditLogs} />
          </>
        ) : null}
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
