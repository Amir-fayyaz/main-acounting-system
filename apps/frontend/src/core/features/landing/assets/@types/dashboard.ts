import type { LandingIconName } from '@/core/features/landing/components/ui/icon/LandingIcon';

export type DashboardView = 'overview' | 'sales' | 'bank';

export type DashboardPeriod = 'month' | 'year';

export interface DashboardReport {
  name: string;
  title: string;
  subtitle: string;
  labels: [string, string, string];
  month: [string, string, string];
  year: [string, string, string];
  feet: [string, string, string];
  yearFeet: [string, string, string];
  chart: string;
  legend: [string, string];
  bars: number[];
  insight: string;
}

export interface DashboardViewOption {
  value: DashboardView;
  label: string;
  icon: LandingIconName;
}

export interface DashboardStaticItem {
  label: string;
  icon: LandingIconName;
}

export interface DashboardReportLink {
  label: string;
  href: string;
  icon: LandingIconName;
  count?: string;
}

export interface DashboardTask {
  icon: LandingIconName;
  title: string;
  description: string;
  badge: string;
}

export interface DashboardPeriodOption {
  value: DashboardPeriod;
  label: string;
}

/**
 * Complete content model for the interactive dashboard preview.
 * Keeping the copy and numbers here lets the landing and demo pages share
 * the same presentation component without sharing their mock data.
 */
export interface DashboardData {
  brandName: string;
  previewAriaLabel: string;
  sidebarAriaLabel: string;
  viewsAriaLabel: string;
  viewSelectLabel: string;
  periodAriaLabel: string;
  workspaceSectionLabel: string;
  reportsSectionLabel: string;
  previewBadgeLabel: string;
  workspace: {
    name: string;
    avatar: string;
    meta: string;
  };
  user: {
    name: string;
    initials: string;
    role: string;
  };
  periodOptions: readonly DashboardPeriodOption[];
  reports: Record<DashboardView, DashboardReport>;
  views: readonly DashboardViewOption[];
  staticItems: readonly DashboardStaticItem[];
  reportLinks: readonly DashboardReportLink[];
  kpiIcons: readonly LandingIconName[];
  kpiUnit: string;
  tasksTitle: string;
  tasksCount: string;
  tasks: readonly DashboardTask[];
  chartUnits: Record<DashboardPeriod, string>;
  chartAriaLabelPrefix: string;
  labelsMonth: readonly string[];
  labelsYear: readonly string[];
  insightLinkLabel: string;
  insightHref: string;
  /** Rendered below the dashboard on the landing page only. */
  footerNote?: string;
}
