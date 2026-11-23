'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CiCircleInfo, CiCirclePlus } from 'react-icons/ci';
import { toast } from 'sonner';

import { Button, SectionLayout } from '@repo/web';
import { PageHeader } from '../../../panel/components/ui/PageHeader';

import type { FiscalAuditLog, FiscalPeriod, FiscalStats, FiscalYear } from '../../assets/@types';
import {
  createFiscalPeriod,
  generateMonthlyPeriods,
  getFiscalAuditLogs,
  getFiscalPeriods,
  getFiscalStats,
  getFiscalYears,
  selectActiveFiscalPeriod,
  updatePeriodStatus,
} from '../../lib/fiscal-periods-api';
import { mapFiscalErrorMessage } from '../../lib/fiscal-api';
import { ClosePeriodDialog } from '../ui/ClosePeriodDialog';
import { FiscalAuditTrailCard } from '../ui/FiscalAuditTrailCard';
import { FiscalPeriodsStats } from '../ui/FiscalPeriodsStats';
import { FiscalPeriodsTable } from '../ui/FiscalPeriodsTable';
import { FiscalYearToolbar } from '../ui/FiscalYearToolbar';
import { NewPeriodDialog } from '../ui/NewPeriodDialog';
import { ReopenPeriodDialog } from '../ui/ReopenPeriodDialog';

interface FiscalDataResult {
  key: string;
  periods: FiscalPeriod[];
  stats: FiscalStats;
  auditLogs: FiscalAuditLog[];
}

export function FiscalPeriodsPage() {
  const searchParams = useSearchParams();
  const yearQueryParam = searchParams?.get('year');

  const [years, setYears] = useState<FiscalYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [dataResult, setDataResult] = useState<FiscalDataResult | null>(null);

  // Dialog states
  const [closingPeriod, setClosingPeriod] = useState<FiscalPeriod | null>(null);
  const [reopeningPeriod, setReopeningPeriod] = useState<FiscalPeriod | null>(null);
  const [isNewPeriodOpen, setIsNewPeriodOpen] = useState(false);

  // Load initial fiscal years
  useEffect(() => {
    let isMounted = true;
    getFiscalYears({ preferApi: true }).then((res) => {
      if (!isMounted) return;
      setYears(res);
      if (res.length > 0) {
        if (yearQueryParam && res.some((y) => y.id === yearQueryParam)) {
          setSelectedYearId(yearQueryParam);
        } else {
          setSelectedYearId(res[0].id);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [yearQueryParam]);

  const dataKey = `${selectedYearId}-${refreshIndex}`;

  useEffect(() => {
    let isMounted = true;
    if (!selectedYearId) return;

    Promise.all([
      getFiscalPeriods(selectedYearId, { preferApi: true }),
      getFiscalStats(selectedYearId),
      getFiscalAuditLogs(),
    ])
      .then(([periodsRes, statsRes, logsRes]) => {
        if (!isMounted) return;
        setDataResult({
          key: dataKey,
          periods: periodsRes,
          stats: statsRes,
          auditLogs: logsRes,
        });
      })
      .catch(() => {
        toast.error('خطا در بارگذاری دوره‌های مالی');
      });

    return () => {
      isMounted = false;
    };
  }, [dataKey, selectedYearId]);

  const loading = dataResult === null || dataResult.key !== dataKey;
  const periods = dataResult !== null && dataResult.key === dataKey ? dataResult.periods : [];
  const stats =
    dataResult !== null && dataResult.key === dataKey
      ? dataResult.stats
      : { openCount: 0, closedCount: 0, totalCount: 0 };
  const auditLogs = dataResult !== null && dataResult.key === dataKey ? dataResult.auditLogs : [];

  const selectedYear = years.find((y) => y.id === selectedYearId) ?? null;

  const handleSelectActive = async (period: FiscalPeriod) => {
    try {
      await selectActiveFiscalPeriod(period.id, { syncWithApi: true });
      toast.success(`دوره‌ی «${period.name}» به عنوان دوره‌ی مالی فعال انتخاب شد`);
      setRefreshIndex((prev) => prev + 1);
    } catch (error) {
      toast.error(mapFiscalErrorMessage(error));
    }
  };

  const handleStartReview = async (period: FiscalPeriod) => {
    try {
      await updatePeriodStatus(period.id, 'review');
      toast.info(`دوره‌ی ${period.name} در وضعیت بازبینی قرار گرفت`);
      setRefreshIndex((prev) => prev + 1);
    } catch (error) {
      toast.error(mapFiscalErrorMessage(error));
    }
  };

  const handleRevertToOpen = async (period: FiscalPeriod) => {
    try {
      await updatePeriodStatus(period.id, 'open');
      toast.success(`دوره‌ی ${period.name} باز شد`);
      setRefreshIndex((prev) => prev + 1);
    } catch (error) {
      toast.error(mapFiscalErrorMessage(error));
    }
  };

  const handleConfirmClose = async (period: FiscalPeriod) => {
    try {
      await updatePeriodStatus(period.id, 'closed', '', { syncWithApi: true });
      toast.success(`دوره‌ی ${period.name} بسته شد`);
      setRefreshIndex((prev) => prev + 1);
    } catch (error) {
      toast.error(mapFiscalErrorMessage(error));
    }
  };

  const handleConfirmReopen = async (period: FiscalPeriod, reason: string) => {
    try {
      await updatePeriodStatus(period.id, 'reopened', reason, { syncWithApi: true });
      toast.success(`دوره‌ی ${period.name} بازگشایی شد و در ممیزی ثبت گردید`);
      setRefreshIndex((prev) => prev + 1);
    } catch (error) {
      toast.error(mapFiscalErrorMessage(error));
    }
  };

  const handleCreatePeriod = async (periodData: Omit<FiscalPeriod, 'id'>) => {
    try {
      await createFiscalPeriod(periodData);
      toast.success('دوره‌ی جدید ایجاد شد');
      setRefreshIndex((prev) => prev + 1);
    } catch {
      toast.error('خطا در ایجاد دوره');
    }
  };

  const handleGeneratePeriods = async () => {
    if (!selectedYearId) return;
    try {
      await generateMonthlyPeriods(selectedYearId);
      toast.success('۱۲ دوره‌ی ماهانه با موفقیت ایجاد شدند');
      setRefreshIndex((prev) => prev + 1);
    } catch {
      toast.error('خطا در تولید دوره‌ها');
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
