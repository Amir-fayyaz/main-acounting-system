'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import { Card, CardContent, SectionLayout, Skeleton } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

import type { Cheque, DashboardMetric, DashboardSnapshot, Invoice } from '../../../assets/@types';
import { listCheques } from '../../../lib/cheques-api';
import { getDashboardSnapshot } from '../../../lib/dashboard-api';
import { listInvoices } from '../../../lib/invoices-api';
import { formatShortMoney, splitShortMoney } from '../../../utils/format-short-money';
import { PageHeader } from '../../ui';
import { DashboardCharts } from './DashboardCharts';
import { DashboardLists } from './DashboardLists';

type DashboardState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; snapshot: DashboardSnapshot; invoices: Invoice[]; cheques: Cheque[] };

const SECONDARY_ACTION_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-semibold transition-colors hover:bg-accent';

const PRIMARY_ACTION_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-dark';

const ERROR_MESSAGE = 'دریافت اطلاعات داشبورد با مشکل مواجه شد. لطفاً دوباره تلاش کنید.';

function DashboardLoading() {
  return (
    <div className="space-y-4" aria-label="در حال بارگذاری داشبورد" aria-busy="true">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Card key={index} className="rounded-lg">
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-7 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="rounded-lg">
          <CardContent className="space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-44 w-full" />
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardContent className="space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-44 w-full" />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={index} className="rounded-lg">
            <CardContent className="space-y-3">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/5" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value, description, trend, highlight }: DashboardMetric) {
  const { amount, unit } = splitShortMoney(formatShortMoney(value));

  return (
    <Card className={cn('rounded-lg', highlight && 'bg-accent')}>
      <CardContent className="space-y-1.5">
        <span className="block text-[13px] text-muted-foreground">{label}</span>
        <b className="block text-[17px] font-bold leading-snug tabular-nums sm:text-[21px]">
          <span>{amount}</span>
          {unit ? (
            <span className="ms-1 text-xs font-medium text-muted-foreground">{unit}</span>
          ) : null}
        </b>
        {description ? (
          <span
            className={cn(
              'block text-xs',
              trend === 'negative' ? 'text-destructive' : 'text-success',
            )}
          >
            {description}
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DashboardContent({
  snapshot,
  invoices,
  cheques,
}: {
  snapshot: DashboardSnapshot;
  invoices: Invoice[];
  cheques: Cheque[];
}) {
  const dueCheques = cheques
    .filter((cheque) => cheque.status === 'near-due' || cheque.status === 'pending')
    .slice(0, 4);

  return (
    <div className="space-y-4">
      <section aria-label="شاخص‌های مالی" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {snapshot.metrics.map((metric) => (
          <MetricCard key={metric.id} {...metric} />
        ))}
      </section>
      <DashboardCharts cashflow={snapshot.cashflow} paymentMethods={snapshot.paymentMethods} />
      <DashboardLists invoices={invoices} cheques={dueCheques} tasks={snapshot.tasks} />
    </div>
  );
}

export function DashboardBlock() {
  const [state, setState] = useState<DashboardState>({ status: 'loading' });

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getDashboardSnapshot(),
      listInvoices({ page: 1, limit: 5 }),
      listCheques({ noPage: true }),
    ])
      .then(([snapshot, invoiceResponse, chequeResponse]) => {
        if (isMounted) {
          setState({
            status: 'success',
            snapshot,
            invoices: invoiceResponse.data,
            cheques: chequeResponse.data,
          });
        }
      })
      .catch(() => {
        if (isMounted) setState({ status: 'error' });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SectionLayout>
      <PageHeader
        title="داشبورد"
        description="خلاصه‌ای از وضعیت مالی امروز"
        actions={
          <>
            <Link href="/journal" className={SECONDARY_ACTION_CLASS}>
              <Plus aria-hidden="true" className="size-5" strokeWidth={1.8} />
              سند جدید
            </Link>
            <Link href="/sales" className={PRIMARY_ACTION_CLASS}>
              <Plus aria-hidden="true" className="size-5" strokeWidth={1.8} />
              فاکتور جدید
            </Link>
          </>
        }
      />
      {state.status === 'loading' ? <DashboardLoading /> : null}
      {state.status === 'error' ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive"
        >
          {ERROR_MESSAGE}
        </div>
      ) : null}
      {state.status === 'success' ? (
        <DashboardContent
          snapshot={state.snapshot}
          invoices={state.invoices}
          cheques={state.cheques}
        />
      ) : null}
    </SectionLayout>
  );
}
