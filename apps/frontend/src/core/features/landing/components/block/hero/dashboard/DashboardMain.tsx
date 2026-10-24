import Link from 'next/link';
import type { Dispatch, SetStateAction } from 'react';

import { H2, P, Span } from '@/core/components/custom/ui/typography/Typography';
import { Button } from '@/core/components/shadcn/ui/button/button';
import type {
  DashboardData,
  DashboardPeriod,
  DashboardReport,
  DashboardView,
} from '@/core/features/landing/assets/@types/dashboard';
import { DashboardChart } from '@/core/features/landing/components/block/hero/dashboard/DashboardChart';
import { DashboardKpis } from '@/core/features/landing/components/block/hero/dashboard/DashboardKpis';
import { DashboardTasks } from '@/core/features/landing/components/block/hero/dashboard/DashboardTasks';
import { DashboardTopbar } from '@/core/features/landing/components/block/hero/dashboard/DashboardTopbar';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { cn } from '@/core/utils/shadcn/utils';

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

      <div className="p-[21px_23px_22px] max-[600px]:p-[15px_12px_18px] max-[800px]:p-[17px_15px]">
        <DashboardHeading
          data={data}
          period={period}
          report={report}
          onPeriodChange={onPeriodChange}
        />
        <DashboardKpis data={data} period={period} report={report} />

        <div className="mt-[13px] grid grid-cols-[1.4fr_1fr] gap-3 max-[600px]:mt-[9px] max-[600px]:grid-cols-1 max-[800px]:grid-cols-[1.2fr_1fr] max-[800px]:gap-2">
          <DashboardChart data={data} period={period} report={report} />
          <DashboardTasks data={data} />
        </div>

        <DashboardInsight data={data} message={report.insight} />
      </div>

      {data.footerNote ? (
        <div className="m-2 flex justify-end max-[600px]:hidden">
          <Span className="rounded-[4px] bg-[#f7f6eedb] p-[2px_8px] !text-[9px] text-[#827866]">
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
    <div className="mb-[17px] flex items-center justify-between gap-3 max-[360px]:items-start max-[600px]:mb-[13px] max-[600px]:gap-[7px] max-[360px]:[&>div:first-child]:min-w-0">
      <div aria-live="polite" aria-atomic="true">
        <H2
          id="dash-greeting"
          className="mb-1 text-[17px] tracking-[-0.4px] max-[600px]:text-[14px] max-[800px]:text-[15px]"
        >
          {report.title}
        </H2>
        <P id="dash-subtitle" className="text-[10px] text-[#746b60] max-[600px]:text-[8px]">
          {report.subtitle}
        </P>
      </div>

      <div
        role="group"
        aria-label={data.periodAriaLabel}
        className="flex gap-[3px] rounded-[5px] border border-[#dfdbd1] bg-white p-[3px] max-[360px]:shrink-0 max-[600px]:p-[2px]"
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
                'h-auto rounded-[3px] border-0 bg-transparent p-[4px_10px] text-[10px] font-normal text-[#746b60] shadow-none hover:scale-100 hover:bg-transparent active:scale-100 max-[360px]:px-[5px] max-[360px]:whitespace-nowrap max-[600px]:p-[3px_7px] max-[600px]:text-[9px]',
                selected && 'bg-[#f4f3e7] font-bold text-[#1a120a] hover:bg-[#f4f3e7]',
              )}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function DashboardInsight({ data, message }: { data: DashboardData; message: string }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-[10px] rounded-[6px] border border-[#e6e2d4] bg-[#f5f3e9] p-[10px_12px] text-[10px] max-[600px]:mt-[9px] max-[600px]:gap-1 max-[600px]:p-2 max-[600px]:text-[8px] max-[800px]:text-[9px]">
      <div className="flex items-center gap-[8px] max-[600px]:gap-[5px]">
        <LandingIcon name="spark" className="size-[17px] text-[#a46700] max-[600px]:size-3.5" />
        <Span className="!text-[10px] max-[800px]:!text-[9px] max-[600px]:!text-[8px]">
          {message}
        </Span>
      </div>

      <Link
        href={data.insightHref}
        className="whitespace-nowrap text-[9px] text-[#885300] max-[600px]:text-[8px]"
      >
        {data.insightLinkLabel}
      </Link>
    </div>
  );
}
