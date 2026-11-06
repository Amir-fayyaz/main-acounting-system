import { existsSync } from 'node:fs';
import path from 'node:path';

import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PaginatedResponse } from '@repo/web';
import type { ActivityItem } from '../assets/@types';
import { createMockDashboardSnapshot, createMockRecentActivity } from '../assets/mock/dashboard';
import { DashboardBlock } from '../components/block/dashboard/DashboardBlock';

const api = vi.hoisted(() => ({
  getDashboardSnapshot: vi.fn(),
  listRecentActivity: vi.fn(),
}));
vi.mock('../lib/dashboard-api', () => api);

const PANEL_ROUTES_DIR = path.join(process.cwd(), 'src/app/(panel)');

function activityResponse(activity: ActivityItem[]): PaginatedResponse<ActivityItem> {
  return {
    data: activity,
    meta: { page: 1, limit: 5, total: activity.length, totalPages: 1 },
  };
}

const METRIC_LABELS = [
  'موجودی حساب‌های بانکی',
  'موجودی صندوق‌ها',
  'دریافت‌های امروز',
  'پرداخت‌های امروز',
  'فروش امروز',
  'خرید امروز',
  'سود خالص ماه',
  'مطالبات از مشتریان',
];

beforeEach(() => {
  api.getDashboardSnapshot.mockReset();
  api.listRecentActivity.mockReset();
});

describe('DashboardBlock', () => {
  it('shows the loading skeleton while the dashboard requests are pending', () => {
    api.getDashboardSnapshot.mockReturnValue(new Promise(() => {}));
    api.listRecentActivity.mockReturnValue(new Promise(() => {}));

    render(<DashboardBlock />);

    expect(screen.getByLabelText('در حال بارگذاری داشبورد')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders an alert when the dashboard requests fail', async () => {
    api.getDashboardSnapshot.mockRejectedValue(new Error('snapshot failed'));
    api.listRecentActivity.mockRejectedValue(new Error('activity failed'));

    render(<DashboardBlock />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'دریافت اطلاعات داشبورد با مشکل مواجه شد. لطفاً دوباره تلاش کنید.',
    );
  });

  it('renders all 8 metrics with Persian formatted money values', async () => {
    api.getDashboardSnapshot.mockResolvedValue(createMockDashboardSnapshot());
    api.listRecentActivity.mockResolvedValue(activityResponse(createMockRecentActivity()));

    render(<DashboardBlock />);

    const section = await screen.findByLabelText('شاخص‌های مالی');
    for (const label of METRIC_LABELS) {
      expect(within(section).getByText(label)).toBeInTheDocument();
    }
    expect(within(section).getAllByText('ریال')).toHaveLength(8);
    expect(within(section).getByText('۴۸٬۲۰۰٬۰۰۰٬۰۰۰')).toBeInTheDocument();
    expect(within(section).queryByText(/\d{1,3},\d{3}/)).not.toBeInTheDocument();
  });

  it('shows the empty-state copy when there is no recent activity', async () => {
    api.getDashboardSnapshot.mockResolvedValue(createMockDashboardSnapshot());
    api.listRecentActivity.mockResolvedValue(activityResponse([]));

    render(<DashboardBlock />);

    expect(await screen.findByText('هنوز فعالیتی برای نمایش وجود ندارد.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('links the dashboard CTAs to routes that exist in the route tree', async () => {
    api.getDashboardSnapshot.mockResolvedValue(createMockDashboardSnapshot());
    api.listRecentActivity.mockResolvedValue(activityResponse(createMockRecentActivity()));

    render(<DashboardBlock />);

    const journalCta = await screen.findByRole('link', { name: 'ثبت سند جدید' });
    const invoiceCta = screen.getByRole('link', { name: 'فاکتور جدید' });
    expect(journalCta).toHaveAttribute('href', '/panel/journal');
    expect(invoiceCta).toHaveAttribute('href', '/panel/sales');
    expect(existsSync(path.join(PANEL_ROUTES_DIR, 'panel/journal/page.tsx'))).toBe(true);
    expect(existsSync(path.join(PANEL_ROUTES_DIR, 'panel/sales/page.tsx'))).toBe(true);
  });

  it('renders Persian status chips for recent activity', async () => {
    api.getDashboardSnapshot.mockResolvedValue(createMockDashboardSnapshot());
    api.listRecentActivity.mockResolvedValue(activityResponse(createMockRecentActivity()));

    render(<DashboardBlock />);

    expect(await screen.findByText('نیازمند بررسی')).toBeInTheDocument();
    expect(screen.getByText('در انتظار')).toBeInTheDocument();
    expect(screen.getAllByText('موفق')).toHaveLength(3);
  });
});
