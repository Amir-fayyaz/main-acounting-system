'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, Info, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  H1,
  Muted,
  SectionLayout,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/web/ui';

import type { FiscalPeriod, FiscalPeriodAction } from '../../assets/@types/fiscal-periods.types';
import { FISCAL_PERIOD_DEMO_OPTIONS } from '../../lib/fiscal-period.config';
import { createSuggestedPeriodDraft } from '../../lib/fiscal-period.selectors';
import { useFiscalPeriods } from '../../hook/useFiscalPeriods';
import { formatJalaliDate } from '../../utils/format';
import { FiscalEmptyState } from '../ui/FiscalEmptyState';
import { FiscalNotice } from '../ui/FiscalNotice';
import { FiscalPeriodStatCard } from '../ui/FiscalPeriodStatCard';
import { FiscalPeriodAuditTrail } from './FiscalPeriodAuditTrail';
import { FiscalPeriodsTable } from './FiscalPeriodsTable';
import { CloseFiscalPeriodDialog } from './dialogs/CloseFiscalPeriodDialog';
import { CreateFiscalPeriodDialog } from './dialogs/CreateFiscalPeriodDialog';
import { ReopenFiscalPeriodDialog } from './dialogs/ReopenFiscalPeriodDialog';

export function FiscalPeriodsPage() {
  const fiscal = useFiscalPeriods();
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [closingPeriod, setClosingPeriod] = useState<FiscalPeriod | null>(null);
  const [reopeningPeriod, setReopeningPeriod] = useState<FiscalPeriod | null>(null);
  // با هر بار باز شدن دیالوگ، کلید آن عوض می‌شود تا فرم و تیکه‌های تأیید از نو ساخته شوند.
  const [dialogSession, setDialogSession] = useState(0);

  const suggestedDraft = useMemo(
    () => createSuggestedPeriodDraft(fiscal.selectedYear, fiscal.periods),
    [fiscal.selectedYear, fiscal.periods],
  );

  const openCreateDialog = () => {
    setCreateOpen(true);
    setDialogSession((session) => session + 1);
  };

  const handlePeriodAction = (action: FiscalPeriodAction, period: FiscalPeriod) => {
    switch (action) {
      case 'review':
        fiscal.startReview(period.id);
        toast.success(`دوره‌ی ${period.name} به بازبینی رفت.`);
        break;
      case 'open':
        fiscal.returnToOpen(period.id);
        toast.success(`دوره‌ی ${period.name} دوباره باز شد.`);
        break;
      case 'close':
        setClosingPeriod(period);
        setDialogSession((session) => session + 1);
        break;
      case 'reopen':
        setReopeningPeriod(period);
        setDialogSession((session) => session + 1);
        break;
    }
  };

  return (
    <SectionLayout>
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <H1 className="text-start text-xl font-bold tracking-tight sm:text-2xl">
              دوره‌های مالی
            </H1>
            <Muted className="text-start text-xs leading-6 sm:text-sm">
              ایجاد، باز و بسته کردن دوره‌ها؛ ثبت فقط در دوره‌ی باز مجاز است
            </Muted>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={fiscal.demoMode}
              onValueChange={(value) => fiscal.setDemoMode(value as typeof fiscal.demoMode)}
            >
              <SelectTrigger className="w-full min-w-36 sm:w-44" aria-label="حالت نمایشی داده‌ها">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FISCAL_PERIOD_DEMO_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button className="gap-1.5" disabled={!fiscal.selectedYear} onClick={openCreateDialog}>
              <Plus className="size-4" aria-hidden />
              ایجاد دوره
            </Button>
          </div>
        </header>

        {fiscal.selectedYear ? (
          <section
            aria-label="سال مالی"
            className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <Select value={fiscal.selectedYear.id} onValueChange={fiscal.selectYear}>
              <SelectTrigger className="w-full sm:w-48" aria-label="انتخاب سال مالی">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fiscal.years.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Muted className="text-xs tabular-nums sm:text-sm">
              {formatJalaliDate(fiscal.selectedYear.from)} تا{' '}
              {formatJalaliDate(fiscal.selectedYear.to)}
            </Muted>
          </section>
        ) : (
          <FiscalEmptyState
            icon={CalendarDays}
            title="هنوز سال مالی تعریف نشده"
            description="دوره‌ها داخل سال مالی ساخته می‌شوند؛ برای شروع، بازه‌ی سال مالی را تعریف کنید."
          />
        )}

        <section aria-label="خلاصه‌ی وضعیت دوره‌ها" className="grid gap-3 sm:grid-cols-3">
          <FiscalPeriodStatCard label="دوره‌های باز" value={fiscal.stats.open} />
          <FiscalPeriodStatCard label="دوره‌های بسته" value={fiscal.stats.closed} />
          <FiscalPeriodStatCard label="کل دوره‌ها" value={fiscal.stats.total} />
        </section>

        <FiscalNotice icon={<Info className="size-4 text-brand-dark" />}>
          ثبت سند، فاکتور، دریافت و پرداخت فقط در دوره‌های «باز» و «بازگشایی‌شده» انجام می‌شود. در
          دوره‌ی «در بازبینی» ثبت جدید متوقف است.
        </FiscalNotice>

        {fiscal.periods.length > 0 ? (
          <section
            aria-label="فهرست دوره‌های مالی"
            className="overflow-hidden rounded-lg border border-border bg-card"
          >
            <FiscalPeriodsTable periods={fiscal.periods} onAction={handlePeriodAction} />
          </section>
        ) : fiscal.selectedYear ? (
          <FiscalEmptyState
            icon={CalendarDays}
            title="این سال هنوز دوره ندارد"
            description="می‌توانید ۱۲ دوره‌ی ماهانه را یکجا بسازید یا یک دوره را دستی تعریف کنید."
            actions={
              <>
                <Button onClick={fiscal.generateMonthlyPeriods}>تولید ۱۲ دوره‌ی ماهانه</Button>
                <Button variant="outline" onClick={openCreateDialog}>
                  ایجاد دوره
                </Button>
              </>
            }
          />
        ) : null}

        <FiscalPeriodAuditTrail logs={fiscal.logs} />
      </div>

      <CreateFiscalPeriodDialog
        key={`create-${dialogSession}`}
        open={isCreateOpen}
        onOpenChange={setCreateOpen}
        year={fiscal.selectedYear}
        periods={fiscal.periods}
        suggestedDraft={suggestedDraft}
        onSubmit={(draft) => {
          fiscal.createPeriod(draft);
          toast.success(`دوره‌ی «${draft.name}» ایجاد شد.`);
        }}
      />

      <CloseFiscalPeriodDialog
        key={`close-${dialogSession}`}
        period={closingPeriod}
        onOpenChange={(open) => {
          if (!open) setClosingPeriod(null);
        }}
        onConfirm={(periodId) => {
          fiscal.closePeriod(periodId);
          setClosingPeriod(null);
          toast.success('دوره بسته شد.');
        }}
      />

      <ReopenFiscalPeriodDialog
        key={`reopen-${dialogSession}`}
        period={reopeningPeriod}
        onOpenChange={(open) => {
          if (!open) setReopeningPeriod(null);
        }}
        onConfirm={(periodId, reason) => {
          fiscal.reopenPeriod(periodId, reason);
          setReopeningPeriod(null);
          toast.success('دوره بازگشایی شد.');
        }}
      />
    </SectionLayout>
  );
}
