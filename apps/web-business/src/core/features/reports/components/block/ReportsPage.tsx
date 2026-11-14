'use client';

import { Button, Card, CardContent, H1, P, SectionLayout, Skeleton } from '@repo/web/ui';

import { useState } from 'react';

import { useReports } from '../../hook/useReports';
import { ReportGroupCard } from '../ui/ReportGroupCard';
import { DateRangeDialog } from '../ui/DateRangeDialog';

const PAGE_TITLE = 'گزارش‌ها';
const PAGE_DESCRIPTION = 'گزارش‌های مالی، خزانه‌داری، فروش و مدیریتی';
const ERROR_MESSAGE = 'دریافت اطلاعات گزارش با مشکل مواجه شد. لطفاً دوباره تلاش کنید.';
const EMPTY_MESSAGE = 'هیچ گزارش در دسترس نیست.';

function ReportsLoading() {
  return (
    <div className="space-y-4" aria-label="در حال بارگذاری گزارش‌ها" aria-busy="true">
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="rounded-lg">
            <CardContent className="space-y-3">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ReportsError({ retry }: { retry: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive"
    >
      {ERROR_MESSAGE}
      <Button type="button" onClick={retry} className="mt-4">
        تلاش مجدد
      </Button>
    </div>
  );
}

function ReportsEmpty() {
  return <p className="py-6 text-center text-sm text-muted-foreground">{EMPTY_MESSAGE}</p>;
}

export function ReportsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReportLabel, setSelectedReportLabel] = useState<string | null>(null);

  const { state, branches, statuses, findReport, retry } = useReports();

  return (
    <SectionLayout className="flex flex-1 flex-col py-6 sm:py-8 [&>.pages-container]:flex [&>.pages-container]:flex-1 [&>.pages-container]:flex-col [&>.pages-container]:gap-6 [&>.pages-container]:space-y-0 [&>.pages-container]:px-4 sm:[&>.pages-container]:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <H1 className="text-start text-xl font-bold sm:text-2xl">{PAGE_TITLE}</H1>
          <P className="text-sm text-muted-foreground">{PAGE_DESCRIPTION}</P>
        </div>
      </div>
      {state.status === 'loading' ? (
        <ReportsLoading />
      ) : state.status === 'error' ? (
        <ReportsError retry={retry} />
      ) : state.reportGroups.length === 0 ? (
        <ReportsEmpty />
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {state.reportGroups.map((group) => (
            <ReportGroupCard
              key={group.id}
              group={group}
              onReportSelect={(reportId) => {
                const label = findReport(reportId);
                if (label) {
                  setSelectedReportLabel(label);
                  setDialogOpen(true);
                }
              }}
            />
          ))}
        </div>
      )}
      {selectedReportLabel && state.status === 'success' && (
        <DateRangeDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setSelectedReportLabel(null);
          }}
          reportLabel={selectedReportLabel}
          branches={branches}
          statuses={statuses}
          onConfirm={() => {
            setDialogOpen(false);
            setSelectedReportLabel(null);
          }}
        />
      )}
    </SectionLayout>
  );
}
