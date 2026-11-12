'use client';

import { Card, H2 } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

export function ReportGroupCard({
  group,
  onReportSelect,
}: {
  group: { title: string; items: readonly { id: string; label: string }[] };
  onReportSelect: (reportId: string) => void;
}) {
  return (
    <Card className={cn('rounded-xl border border-border rep-group p-[18px] gap-0')}>
      <H2 className="text-[15px] font-bold mb-2">{group.title}</H2>
      <div className="flex flex-col gap-0">
        {group.items.map((report) => (
          <button
            key={report.id}
            type="button"
            className="flex w-full items-center justify-between gap-2 px-[10px] py-[9px] rounded-md text-start transition-colors hover:bg-muted"
            onClick={() => onReportSelect(report.id)}
          >
            <span>{report.label}</span>
            <span className="text-muted-foreground text-xs">باز کردن</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
