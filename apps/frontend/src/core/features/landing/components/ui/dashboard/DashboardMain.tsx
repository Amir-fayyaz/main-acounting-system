import Link from 'next/link';
import type { Dispatch, SetStateAction } from 'react';

import { Button, H2, P, Span } from '@repo/web/ui';

import type {
  DashboardData,
  DashboardPeriod,
  DashboardReport,
  DashboardView,
} from '@/core/features/landing/assets/@types/dashboard';
import { DashboardChart } from '@/core/features/landing/components/ui/dashboard/DashboardChart';
import { DashboardKpis } from '@/core/features/landing/components/ui/dashboard/DashboardKpis';
import { DashboardTasks } from '@/core/features/landing/components/ui/dashboard/DashboardTasks';
import { DashboardTopbar } from '@/core/features/landing/components/ui/dashboard/DashboardTopbar';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { cn } from '@repo/web/ui/utils/cn';

interface DashboardMainProps {
  data: DashboardData;
  period: DashboardPeriod;
  report: DashboardReport;
  view: DashboardView;
  onPeriodChange: Dispatch<SetStateAction<DashboardPeriod>>;
  onViewChange: Dispatch<SetStateAction<DashboardView>>;
}

export function DashboardMain({
  data,
  period,
  report,
  view,
  onPeriodChange,
  onViewChange,
}: DashboardMainProps) {
  return (
    <div className="min-w-0">
      <DashboardTopbar
        data={data}
        reportName={report.name}
        view={view}
        onViewChange={onViewChange}
      />

      <div className="pt-5 px-6 pb-5 max-sm:pt-3.5 max-sm:px-3 max-sm:pb-4 max-md:py-4 max-md:px-3.5">
        <DashboardHeading
          data={data}
          period={period}
          report={report}
          onPeriodChange={onPeriodChange}
        />
        <DashboardKpis data={data} period={period} report={report} />

        <div className="mt-3 grid grid-cols-[1.4fr_1fr] gap-3 max-sm:mt-2 max-sm:grid-cols-1 max-md:grid-cols-[1.2fr_1fr] max-md:gap-2">
          <DashboardChart data={data} period={period} report={report} />
          <DashboardTasks data={data} />
        </div>

        <DashboardInsight data={data} message={report.insight} />
      </div>

      {data.footerNote ? (
        <div className="m-2 flex justify-end max-sm:hidden">
          <Span className="rounded-sm bg-background/85 py-0.5 px-2 text-xs! text-muted-foreground">
            {data.footerNote}
          </Span>
        </div>
      ) : null}
    </div>
  );
}

function DashboardHeading({
  data,
  period,
  report,
  onPeriodChange,
}: Pick<DashboardMainProps, 'data' | 'period' | 'report' | 'onPeriodChange'>) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 max-sm:mb-3 max-sm:gap-1.5">
      <div aria-live="polite" aria-atomic="true">
        <H2
          id="dash-greeting"
          className="mb-1 text-base tracking-tight max-sm:text-sm max-md:text-sm"
        >
          {report.title}
        </H2>
        <P id="dash-subtitle" className="text-xs text-muted-foreground">
          {report.subtitle}
        </P>
      </div>

      <div
        role="group"
        aria-label={data.periodAriaLabel}
        className="flex gap-0.5 rounded-sm border border-border bg-card p-0.5"
      >
        {data.periodOptions.map((option) => {
          const selected = period === option.value;

          return (
            <Button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onPeriodChange(option.value)}
              variant="ghost"
              size="sm"
              className={cn(
                'h-auto rounded-sm border-0 bg-transparent py-1 px-2.5 text-xs font-normal text-muted-foreground shadow-none hover:scale-100 hover:bg-transparent active:scale-100 max-sm:py-0.5 max-sm:px-1.5',
                selected && 'bg-sand font-bold text-foreground hover:bg-sand',
              )}
            >
              <Span className="text-[length:inherit]">{option.label}</Span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function DashboardInsight({ data, message }: { data: DashboardData; message: string }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-2.5 rounded-md border border-border bg-sand py-2.5 px-3 text-xs max-sm:mt-2 max-sm:gap-1 max-sm:p-2">
      <div className="flex items-center gap-2 max-sm:gap-1">
        <LandingIcon name="spark" className="size-4 text-brand-link max-sm:size-3.5" />
        <Span className="text-xs!">{message}</Span>
      </div>

      <Link href={data.insightHref} className="whitespace-nowrap text-xs text-muted-foreground">
        <Span className="text-[length:inherit]">{data.insightLinkLabel}</Span>
      </Link>
    </div>
  );
}
