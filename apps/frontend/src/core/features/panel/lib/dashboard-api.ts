import type { ActivityItem, DashboardSnapshot, ListParams } from '../assets/@types';
import type { PaginatedResponse } from '@repo/web';
import { createMockDashboardSnapshot, createMockRecentActivity } from '../assets/mock/dashboard';
import { waitForMockResponse } from '../assets/mock/mock-utils';
import { listMockRows } from './mock-api-utils';

const dashboardSnapshot = createMockDashboardSnapshot();
const recentActivity = createMockRecentActivity();

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  return waitForMockResponse(dashboardSnapshot);
}

export async function listRecentActivity(
  params: ListParams = {},
): Promise<PaginatedResponse<ActivityItem>> {
  return listMockRows(recentActivity, params, {
    getSearchText: (item) => [item.title, item.description, item.occurredAt].join(' '),
  });
}
