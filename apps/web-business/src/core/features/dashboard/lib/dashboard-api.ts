import type { ActivityItem, ListParams } from '../../panel/assets/@types';
import type { DashboardSnapshot } from '../assets/@types/dashboard';
import type { PaginatedResponse } from '@repo/web';
import { createMockDashboardSnapshot, createMockRecentActivity } from '../assets/mock/dashboard';
import { listMockRows } from '../../shared/lib/mock-api-utils';
import { waitForMockResponse } from '../../shared/assets/mock/mock-utils';

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
