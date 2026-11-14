'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';

import { SectionLayout } from '@repo/web/ui';

import { useDashboard } from '../../hook/useDashboard';
import { PageHeader } from '../../../panel/components/ui/PageHeader';
import { DashboardLoading } from './DashboardLoading';
import { DashboardContent } from './DashboardContent';

const SECONDARY_ACTION_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-semibold transition-colors hover:bg-accent';

const PRIMARY_ACTION_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-dark';

const ERROR_MESSAGE = 'دریافت اطلاعات داشبورد با مشکل مواجه شد. لطفاً دوباره تلاش کنید.';

export function DashboardBlock() {
  const state = useDashboard();

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
