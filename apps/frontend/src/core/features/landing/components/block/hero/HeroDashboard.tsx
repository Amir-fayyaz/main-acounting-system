'use client';

import { useState } from 'react';

import type {
  DashboardData,
  DashboardPeriod,
  DashboardView,
} from '@/core/features/landing/assets/@types/dashboard';
import { landingDashboardData } from '@/core/features/landing/assets/mock/dashboard';
import { DashboardMain } from '@/core/features/landing/components/block/hero/dashboard/DashboardMain';
import { DashboardSidebar } from '@/core/features/landing/components/block/hero/dashboard/DashboardSidebar';
import { landingContainerClass } from '@/core/features/landing/lib/landing-classes';
import { cn } from '@/core/utils/shadcn/utils';

const dashboardBaseClass =
  "relative mx-auto rounded-t-[15px] border border-[#ded9cb] bg-[#e9e6dc] p-[8px_8px_0] shadow-[0_20px_60px_#4735180d] before:absolute before:inset-[-7px_22px_auto] before:-z-10 before:h-2 before:rounded-t-[13px] before:border before:border-b-0 before:border-[#e4dece] before:content-[''] max-[1050px]:mx-[18px] max-[600px]:rounded-t-[10px] max-[600px]:p-[5px_5px_0] max-[600px]:shadow-[0_10px_30px_#49391908] max-[800px]:mx-0";

const dashboardInnerClass =
  'relative grid min-h-[470px] grid-cols-[174px_1fr] overflow-hidden rounded-t-[9px] border border-[#dfdbd1] bg-[#fcfcf8] leading-[1.7] max-[600px]:min-h-0 max-[600px]:grid-cols-1 max-[600px]:rounded-t-[6px] max-[800px]:min-h-[438px] max-[800px]:grid-cols-[132px_1fr]';

interface HeroDashboardProps {
  /** Content for the preview. Landing and demo each provide their own mock data. */
  data?: DashboardData;
  /** Anchor id for the dashboard preview (e.g. `demo` on the demo page). */
  id?: string;
  variant?: 'landing' | 'demo';
  className?: string;
}

export function HeroDashboard({
  data = landingDashboardData,
  id = 'product-preview',
  variant = 'landing',
  className,
}: HeroDashboardProps) {
  const [view, setView] = useState<DashboardView>('overview');
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const isDemo = variant === 'demo';

  return (
    <div className={landingContainerClass}>
      <div
        id={id}
        className={cn(
          dashboardBaseClass,
          isDemo
            ? 'mt-[25px] max-w-[1160px] rounded-[15px] pb-2 max-[600px]:mt-8'
            : 'mt-12 max-w-[1080px] min-[1500px]:mt-[54px] max-[600px]:mt-8',
          className,
        )}
      >
        <div
          role="region"
          aria-label={data.previewAriaLabel}
          className={cn(
            dashboardInnerClass,
            isDemo && 'min-h-[480px] rounded-[9px] max-[600px]:min-h-0 max-[600px]:rounded-[6px]',
          )}
        >
          <DashboardSidebar data={data} view={view} onViewChange={setView} />
          <DashboardMain
            data={data}
            period={period}
            report={data.reports[view]}
            view={view}
            onPeriodChange={setPeriod}
            onViewChange={setView}
          />
        </div>
      </div>
    </div>
  );
}
