'use client';

import { H1, P, SectionLayout } from '@repo/web/ui';

import { useState } from 'react';

import { reportGroups } from '../../assets/mock/reports';
import { ReportGroupCard } from '../ui/ReportGroupCard';
import { DateRangeDialog } from '../ui/DateRangeDialog';

const PAGE_TITLE = 'گزارش‌ها';
const PAGE_DESCRIPTION = 'گزارش‌های مالی، خزانه‌داری، فروش و مدیریتی';

export function ReportsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReportLabel, setSelectedReportLabel] = useState<string | null>(null);

  const findReport = (reportId: string) => {
    for (const group of reportGroups) {
      const report = group.items.find((item) => item.id === reportId);
      if (report) return report.label;
    }
    return null;
  };

  return (
    <SectionLayout className="flex flex-1 flex-col py-6 sm:py-8 [&>.pages-container]:flex [&>.pages-container]:flex-1 [&>.pages-container]:flex-col [&>.pages-container]:gap-6 [&>.pages-container]:space-y-0 [&>.pages-container]:px-4 sm:[&>.pages-container]:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <H1 className="text-start text-xl font-bold sm:text-2xl">{PAGE_TITLE}</H1>
          <P className="text-sm text-muted-foreground">{PAGE_DESCRIPTION}</P>
        </div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {reportGroups.map((group) => (
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
      {selectedReportLabel && (
        <DateRangeDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setSelectedReportLabel(null);
          }}
          reportLabel={selectedReportLabel}
          onConfirm={() => {
            setDialogOpen(false);
            setSelectedReportLabel(null);
          }}
        />
      )}
    </SectionLayout>
  );
}
