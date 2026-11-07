'use client';

import { Lock } from 'lucide-react';

import { Button, DataTable, Small, Span, type DataTableColumn } from '@repo/web/ui';

import type { FiscalPeriod, FiscalPeriodAction } from '../../assets/@types/fiscal-periods.types';
import {
  FISCAL_PERIOD_ACTION_LABELS,
  FISCAL_PERIOD_RECLOSE_LABEL,
} from '../../lib/fiscal-period.config';
import { formatJalaliDate } from '../../utils/format';
import { FiscalPeriodStatusBadge } from '../ui/FiscalPeriodStatusBadge';

interface FiscalPeriodsTableProps {
  periods: FiscalPeriod[];
  onAction: (action: FiscalPeriodAction, period: FiscalPeriod) => void;
}

function PeriodRowActions({
  period,
  onAction,
}: {
  period: FiscalPeriod;
  onAction: FiscalPeriodsTableProps['onAction'];
}) {
  if (period.status === 'closing') {
    return <Small className="text-xs text-muted-foreground sm:text-sm">در حال پردازش…</Small>;
  }

  const isInReview = period.status === 'review';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {period.status === 'open' || isInReview ? (
        <>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5 text-xs sm:text-sm text-accent-foreground border-border"
            aria-label={`${isInReview ? FISCAL_PERIOD_ACTION_LABELS.open : FISCAL_PERIOD_ACTION_LABELS.review} ${period.name}`}
            onClick={() => onAction(isInReview ? 'open' : 'review', period)}
          >
            {isInReview ? FISCAL_PERIOD_ACTION_LABELS.open : FISCAL_PERIOD_ACTION_LABELS.review}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5 text-xs sm:text-sm text-accent-foreground border-border"
            aria-label={`بستن دوره ${period.name}`}
            onClick={() => onAction('close', period)}
          >
            {FISCAL_PERIOD_ACTION_LABELS.close}
          </Button>
        </>
      ) : null}

      {period.status === 'closed' ? (
        <Button
          size="sm"
          variant="outline"
          className="h-8 border-transparent bg-accent px-2.5 text-xs text-primary sm:text-sm"
          aria-label={`بازگشایی دوره ${period.name}`}
          onClick={() => onAction('reopen', period)}
        >
          {FISCAL_PERIOD_ACTION_LABELS.reopen}
        </Button>
      ) : null}

      {period.status === 'reopened' ? (
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2.5 text-xs sm:text-sm text-accent-foreground border-border"
          aria-label={`بستن دوباره‌ی دوره ${period.name}`}
          onClick={() => onAction('close', period)}
        >
          {FISCAL_PERIOD_RECLOSE_LABEL}
        </Button>
      ) : null}
    </div>
  );
}

export function FiscalPeriodsTable({ periods, onAction }: FiscalPeriodsTableProps) {
  const columns = [
    {
      key: 'name',
      header: 'دوره',
      headerClassName: 'bg-muted text-sm font-semibold text-muted-foreground sm:text-xs',
      className: 'min-w-32',
      cell: (period: FiscalPeriod) => (
        <div className="flex flex-col gap-1">
          <Span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            {period.status === 'closed' ? (
              <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            ) : null}
            {period.name}
          </Span>
          <Small className="text-sm leading-5 tabular-nums text-muted-foreground sm:hidden">
            {formatJalaliDate(period.from)} تا {formatJalaliDate(period.to)}
          </Small>
        </div>
      ),
    },
    {
      key: 'from',
      header: 'از تاریخ',
      headerClassName:
        'hidden bg-muted text-sm font-semibold text-muted-foreground sm:table-cell sm:text-xs',
      className: 'hidden text-xs tabular-nums text-muted-foreground sm:table-cell sm:text-sm',
      cell: (period: FiscalPeriod) => formatJalaliDate(period.from),
    },
    {
      key: 'to',
      header: 'تا تاریخ',
      headerClassName:
        'hidden bg-muted text-sm font-semibold text-muted-foreground sm:table-cell sm:text-xs',
      className: 'hidden text-xs tabular-nums text-muted-foreground sm:table-cell sm:text-sm',
      cell: (period: FiscalPeriod) => formatJalaliDate(period.to),
    },
    {
      key: 'status',
      header: 'وضعیت',
      headerClassName: 'bg-muted text-sm font-semibold text-muted-foreground sm:text-xs',
      className: 'whitespace-nowrap',
      cell: (period: FiscalPeriod) => <FiscalPeriodStatusBadge status={period.status} />,
    },
    {
      key: 'actions',
      header: 'عملیات',
      headerClassName: 'bg-muted text-start text-sm font-semibold text-muted-foreground sm:text-xs',
      className: 'whitespace-nowrap',
      cell: (period: FiscalPeriod) => <PeriodRowActions period={period} onAction={onAction} />,
    },
  ] satisfies DataTableColumn<FiscalPeriod>[];

  return (
    <DataTable
      aria-label="فهرست دوره‌های مالی"
      columns={columns}
      data={periods}
      rowKey={(period) => period.id}
      emptyMessage="دوره‌ای برای این سال ثبت نشده است."
      className="text-sm"
    />
  );
}
