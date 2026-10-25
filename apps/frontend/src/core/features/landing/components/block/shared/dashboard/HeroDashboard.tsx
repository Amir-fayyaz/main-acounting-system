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
    <div>
      <div
        id={id}
        className={cn(
          'dashboardBaseClass',
          isDemo
            ? 'mt-6 max-w-280 rounded-2xl pb-2 max-sm:mt-8'
            : 'mt-12 max-w-280 2xl:mt-14 max-sm:mt-8',
          className,
        )}
      >
        <div
          role="region"
          aria-label={data.previewAriaLabel}
          className={cn(
            'dashboardInnerClass',
            isDemo && 'min-h-112 rounded-lg max-sm:min-h-0 max-sm:rounded-md',
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
