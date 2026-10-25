'use client';

import { useState } from 'react';

import type {
  DashboardData,
  DashboardPeriod,
  DashboardView,
} from '@/core/features/landing/assets/@types/dashboard';
import { landingDashboardData } from '@/core/features/landing/assets/mock/dashboard';
import { DashboardMain } from '@/core/features/landing/components/ui/dashboard/DashboardMain';
import { DashboardSidebar } from '@/core/features/landing/components/ui/dashboard/DashboardSidebar';
import { cn } from '@/core/utils/shadcn/utils';

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
    <div className="landingContainerClass">
      <div
        id={id}
        className={cn(
          'dashboardBaseClass',
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
            'dashboardInnerClass',
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
