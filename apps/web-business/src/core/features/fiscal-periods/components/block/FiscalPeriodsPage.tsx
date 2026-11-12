'use client';

import { useEffect, useState } from 'react';
import { CiCalendarDate, CiCircleInfo, CiCirclePlus, CiRedo } from 'react-icons/ci';
import { toast } from 'sonner';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  SectionLayout,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/web';
import { PageHeader } from '../../../panel/components/ui/PageHeader';

import type { FiscalAuditLog, FiscalPeriod, FiscalStats, FiscalYear } from '../../assets/@types';
import {
  createFiscalPeriod,
  generateMonthlyPeriods,
  getFiscalAuditLogs,
  getFiscalPeriods,
  getFiscalStats,
  getFiscalYears,
  updatePeriodStatus,
} from '../../lib/fiscal-periods-api';
import { toFaDigits } from '../../utils/fiscal-date';
import { ClosePeriodDialog } from '../ui/ClosePeriodDialog';
import { NewPeriodDialog } from '../ui/NewPeriodDialog';
import { PeriodStatusBadge } from '../ui/PeriodStatusBadge';
import { ReopenPeriodDialog } from '../ui/ReopenPeriodDialog';

interface FiscalDataResult {
  key: string;
  periods: FiscalPeriod[];
  stats: FiscalStats;
  auditLogs: FiscalAuditLog[];
}

export function FiscalPeriodsPage() {
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
    getFiscalYears().then((res) => {
      if (!isMounted) return;
      setYears(res);
      if (res.length > 0) {
        setSelectedYearId(res[0].id);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const dataKey = `${selectedYearId}-${refreshIndex}`;

  useEffect(() => {
    let isMounted = true;
    if (!selectedYearId) return;

    Promise.all([
      getFiscalPeriods(selectedYearId),
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

  const handleStartReview = async (period: FiscalPeriod) => {
    try {
      await updatePeriodStatus(period.id, 'review');
      toast.info(`دوره‌ی ${period.name} در وضعیت بازبینی قرار گرفت`);
      setRefreshIndex((prev) => prev + 1);
    } catch {
      toast.error('خطا در تغییر وضعیت دوره');
    }
  };

  const handleRevertToOpen = async (period: FiscalPeriod) => {
    try {
      await updatePeriodStatus(period.id, 'open');
      toast.success(`دوره‌ی ${period.name} باز شد`);
      setRefreshIndex((prev) => prev + 1);
    } catch {
      toast.error('خطا در باز کردن دوره');
    }
  };

  const handleConfirmClose = async (period: FiscalPeriod) => {
    try {
      await updatePeriodStatus(period.id, 'closed');
      toast.success(`دوره‌ی ${period.name} بسته شد`);
      setRefreshIndex((prev) => prev + 1);
    } catch {
      toast.error('خطا در بستن دوره');
    }
  };

  const handleConfirmReopen = async (period: FiscalPeriod, reason: string) => {
    try {
      await updatePeriodStatus(period.id, 'reopened', reason);
      toast.success(`دوره‌ی ${period.name} بازگشایی شد و در ممیزی ثبت گردید`);
      setRefreshIndex((prev) => prev + 1);
    } catch {
      toast.error('خطا در بازگشایی دوره');
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
        {/* Fiscal Year Selector & Range Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-md border border-border bg-card">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">سال مالی:</span>
            <select
              aria-label="انتخاب سال مالی"
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.title}
                </option>
              ))}
            </select>
          </div>

          {selectedYear && (
            <div className="text-sm text-muted-foreground flex items-center gap-1.5">
              <CiCalendarDate className="size-4" />
              <span>
                از تاریخ {toFaDigits(selectedYear.from)} تا {toFaDigits(selectedYear.to)}
              </span>
            </div>
          )}
        </div>

        {/* 3 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground">دوره‌های باز</div>
              <div className="text-2xl font-bold tabular-nums mt-1 text-success">
                {toFaDigits(stats.openCount)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground">دوره‌های بسته</div>
              <div className="text-2xl font-bold tabular-nums mt-1 text-muted-foreground">
                {toFaDigits(stats.closedCount)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground">کل دوره‌ها</div>
              <div className="text-2xl font-bold tabular-nums mt-1 text-foreground">
                {toFaDigits(stats.totalCount)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Information Banner Alert */}
        <div className="flex items-start gap-2.5 p-3 rounded-md bg-muted/60 text-muted-foreground border border-border text-sm">
          <CiCircleInfo className="size-4 shrink-0 mt-0.5" />
          <span>
            ثبت سند، فاکتور، دریافت و پرداخت فقط در دوره‌های «باز» و «بازگشایی‌شده» انجام می‌شود. در
            دوره‌ی «در بازبینی» ثبت جدید متوقف است.
          </span>
        </div>

        {/* Periods Table */}
        <div className="rounded-md border border-border bg-card overflow-hidden">
          <Table aria-label="دوره‌های مالی">
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/4">دوره</TableHead>
                <TableHead className="w-1/5">از تاریخ</TableHead>
                <TableHead className="w-1/5">تا تاریخ</TableHead>
                <TableHead className="w-1/6">وضعیت</TableHead>
                <TableHead className="text-end">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    در حال بارگذاری دوره‌های مالی…
                  </TableCell>
                </TableRow>
              ) : periods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center">
                    <div className="space-y-3">
                      <p className="text-muted-foreground text-sm">
                        این سال مالی هنوز دوره‌ای ندارد.
                      </p>
                      <div className="flex justify-center gap-2">
                        <Button size="sm" onClick={handleGeneratePeriods}>
                          <CiRedo className="size-3.5 me-1.5" />
                          تولید ۱۲ دوره‌ی ماهانه
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsNewPeriodOpen(true)}
                        >
                          ایجاد دوره
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                periods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">{period.name}</TableCell>
                    <TableCell className="tabular-nums font-mono text-sm">
                      {toFaDigits(period.from)}
                    </TableCell>
                    <TableCell className="tabular-nums font-mono text-sm">
                      {toFaDigits(period.to)}
                    </TableCell>
                    <TableCell>
                      <PeriodStatusBadge status={period.status} />
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex items-center justify-end gap-1.5">
                        {period.status === 'open' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => handleStartReview(period)}
                            >
                              شروع بازبینی
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => setClosingPeriod(period)}
                            >
                              بستن دوره
                            </Button>
                          </>
                        )}

                        {period.status === 'review' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => handleRevertToOpen(period)}
                            >
                              بازگشت به باز
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => setClosingPeriod(period)}
                            >
                              بستن دوره
                            </Button>
                          </>
                        )}

                        {period.status === 'closing' && (
                          <span className="text-xs text-muted-foreground">در حال پردازش…</span>
                        )}

                        {period.status === 'closed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs text-primary hover:bg-primary/10"
                            onClick={() => setReopeningPeriod(period)}
                          >
                            بازگشایی
                          </Button>
                        )}

                        {period.status === 'reopened' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs text-destructive hover:bg-destructive/10"
                            onClick={() => setClosingPeriod(period)}
                          >
                            بستن دوباره
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Audit Trail Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">تاریخچه‌ی قفل و بازگشایی دوره‌ها</CardTitle>
            <p className="text-xs text-muted-foreground">همه‌ی تغییرها در ممیزی ثبت می‌شود</p>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <div className="text-sm text-muted-foreground py-2">هنوز تغییری ثبت نشده است.</div>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {auditLogs.map((log) => (
                  <li
                    key={log.id}
                    className="py-2.5 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-medium text-foreground">
                        {log.action} · {log.period}
                      </span>
                      {log.reason && (
                        <span className="text-xs text-muted-foreground block mt-0.5">
                          دلیل: {log.reason}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {log.who} · {toFaDigits(log.at)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
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
