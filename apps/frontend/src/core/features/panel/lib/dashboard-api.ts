import type { ActivityItem, DashboardSnapshot, ListParams } from '../assets/@types';
import type { PaginatedResponse } from '@repo/web';
import { createMockDashboardSnapshot, createMockRecentActivity } from '../assets/mock/dashboard';
import { filterMockRows, paginateMockRows, waitForMockResponse } from '../assets/mock/mock-utils';

const dashboardSnapshot = createMockDashboardSnapshot();
const recentActivity = createMockRecentActivity();

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  return waitForMockResponse(dashboardSnapshot);
}

export async function listRecentActivity(
  params: ListParams = {},
): Promise<PaginatedResponse<ActivityItem>> {
  const filtered = filterMockRows(recentActivity, params.search, (item) =>
    [item.title, item.description, item.occurredAt].join(' '),
  );
  return waitForMockResponse(paginateMockRows(filtered, params));
}
