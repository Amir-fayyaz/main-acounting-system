'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  H1,
  P,
} from '@repo/web/ui';
import type { ActivityItem, DashboardSnapshot } from '../../../assets/@types';
import { formatMoney } from '../../../assets/mock/mock-utils';
import { getDashboardSnapshot, listRecentActivity } from '../../../lib/dashboard-api';

type DashboardState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; snapshot: DashboardSnapshot; activity: ActivityItem[] };

function DashboardLoading() {
  return (
    <div className="space-y-6" aria-label="در حال بارگذاری داشبورد" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 pt-6">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value, description, trend }: DashboardSnapshot['metrics'][number]) {
  return (
    <Card>
      <CardContent className="space-y-2 pt-6">
        <P className="text-sm text-muted-foreground">{label}</P>
        <p className="text-xl font-bold tabular-nums sm:text-2xl">
          {formatMoney(value)}
          <span className="ms-1 text-xs font-medium text-muted-foreground">ریال</span>
        </p>
        <p
          className={
            trend === 'negative'
              ? 'text-xs text-destructive'
              : trend === 'positive'
                ? 'text-xs text-primary'
                : 'text-xs text-muted-foreground'
          }
        >
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

function DashboardContent({
  snapshot,
  activity,
}: {
  snapshot: DashboardSnapshot;
  activity: ActivityItem[];
}) {
  const maxCashflow = Math.max(
    ...snapshot.cashflow.map((item) => Number(BigInt(item.income.split('.')[0]))),
    1,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <H1 className="text-start text-xl font-bold sm:text-2xl">داشبورد</H1>
          <P className="text-sm text-muted-foreground">خلاصه‌ای از وضعیت مالی امروز</P>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/panel/new-journal"
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            ثبت سند جدید
          </Link>
          <Link
            href="/panel/new-invoice"
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            فاکتور جدید
          </Link>
        </div>
      </div>

      <section aria-label="شاخص‌های مالی" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {snapshot.metrics.map((metric) => (
          <MetricCard key={metric.id} {...metric} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>درآمد و هزینه</CardTitle>
            <CardDescription>مقایسه شش ماه اخیر · میلیارد ریال</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary" /> درآمد
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="size-2 rounded-full bg-secondary-foreground" /> هزینه
              </span>
            </div>
            <div className="space-y-4">
              {snapshot.cashflow.map((item) => {
                const income = Number(BigInt(item.income.split('.')[0]));
                const expense = Number(BigInt(item.expense.split('.')[0]));
                return (
                  <div key={item.month} className="grid grid-cols-[3.5rem_1fr] items-center gap-3">
                    <span className="text-xs text-muted-foreground">{item.month}</span>
                    <div className="space-y-1.5">
                      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(income / maxCashflow) * 100}%` }}
                        />
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-secondary-foreground"
                          style={{ width: `${(expense / maxCashflow) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>روش‌های پرداخت</CardTitle>
            <CardDescription>سهم هر روش از کل پرداخت‌ها</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {snapshot.paymentMethods.map((method) => (
              <div key={method.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{method.label}</span>
                  <span className="font-semibold tabular-nums">{method.percentage}٪</span>
                </div>
                <div
                  className="h-2.5 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label={method.label}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={method.percentage}
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${method.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>آخرین فعالیت‌ها</CardTitle>
          <CardDescription>رویدادهای اخیر ثبت‌شده در پنل</CardDescription>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">هنوز فعالیتی برای نمایش وجود ندارد.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {activity.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{item.occurredAt}</span>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
                      {item.status === 'success'
                        ? 'موفق'
                        : item.status === 'pending'
                          ? 'در انتظار'
                          : 'نیازمند بررسی'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function DashboardBlock() {
  const [state, setState] = useState<DashboardState>({ status: 'loading' });

  useEffect(() => {
    let isMounted = true;

    Promise.all([getDashboardSnapshot(), listRecentActivity({ page: 1, limit: 5 })])
      .then(([snapshot, activityResponse]) => {
        if (isMounted) {
          setState({
            status: 'success',
            snapshot,
            activity: activityResponse.data,
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

  if (state.status === 'loading') return <DashboardLoading />;

  if (state.status === 'error') {
    return (
      <div
        role="alert"
        className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive"
      >
        دریافت اطلاعات داشبورد با مشکل مواجه شد. لطفاً دوباره تلاش کنید.
      </div>
    );
  }

  return <DashboardContent snapshot={state.snapshot} activity={state.activity} />;
}
