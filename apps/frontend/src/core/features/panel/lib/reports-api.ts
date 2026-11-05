import type { PaginatedResponse } from '@repo/web';
import type { ListParams, ReportDefinition } from '../assets/@types';
import { createMockReports } from '../assets/mock/reports';
import { filterMockRows, paginateMockRows, waitForMockResponse } from '../assets/mock/mock-utils';

const reports = createMockReports();

export async function listReports(
  params: ListParams = {},
): Promise<PaginatedResponse<ReportDefinition>> {
  const filtered = filterMockRows(reports, params.search, (report) =>
    [report.title, report.group, report.description].join(' '),
  );
  return waitForMockResponse(paginateMockRows(filtered, params));
}
