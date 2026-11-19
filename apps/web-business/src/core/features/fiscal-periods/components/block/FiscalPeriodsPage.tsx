'use client';

import { useState } from 'react';
import { CiCircleInfo, CiRedo } from 'react-icons/ci';
import { toast } from 'sonner';

import { Button, Card, CardContent, SectionLayout } from '@repo/web';
import { PageHeader } from '../../../panel/components/ui/PageHeader';

import type { FiscalPeriod } from '../../assets/@types';
import { useFiscalPeriods } from '../../hook/useFiscalPeriods';
import { ClosePeriodDialog } from '../ui/ClosePeriodDialog';
import { FiscalPeriodsStats } from '../ui/FiscalPeriodsStats';
import { FiscalPeriodsTable } from '../ui/FiscalPeriodsTable';
import { FiscalYearToolbar } from '../ui/FiscalYearToolbar';
import { ReopenPeriodDialog } from '../ui/ReopenPeriodDialog';

export function FiscalPeriodsPage() {
  const {
    years,
    selectedYearId,
    selectedYear,
    periods,
    stats,
    loading,
    errorMessage,
    selectYear,
    reload,
    closePeriod,
    reopenPeriod,
  } = useFiscalPeriods();

  const [closingPeriod, setClosingPeriod] = useState<FiscalPeriod | null>(null);
  const [reopeningPeriod, setReopeningPeriod] = useState<FiscalPeriod | null>(null);

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

    toast.success(`دوره‌ی ${period.name} بازگشایی شد`);

    return true;
  };

  const hasYears = years.length > 0;

  return (
    <SectionLayout>
      <PageHeader
        title="دوره‌های مالی"
        description="باز و بسته کردن دوره‌های سال مالی شرکت؛ ثبت فقط در دوره‌ی باز مجاز است"
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
                ثبت سند، فاکتور، دریافت و پرداخت فقط در دوره‌های «باز» انجام می‌شود. پس از بستن
                دوره، تغییر فقط با بازگشایی کنترل‌شده و ثبت دلیل ممکن است.
              </span>
            </div>

            <FiscalPeriodsTable
              loading={loading}
              periods={periods}
              onSelectClosePeriod={setClosingPeriod}
              onSelectReopenPeriod={setReopeningPeriod}
            />
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
    </SectionLayout>
  );
}
