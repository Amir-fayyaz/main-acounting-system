import type { PaginatedResponse } from '@repo/web';
import type { ListParams, ReportDefinition } from '../assets/@types';
import { createMockReports } from '../assets/mock/reports';
import { listMockRows } from './mock-api-utils';

const reports = createMockReports();

export async function listReports(
  params: ListParams = {},
): Promise<PaginatedResponse<ReportDefinition>> {
  return listMockRows(reports, params, {
    getSearchText: (report) => [report.title, report.group, report.description].join(' '),
  });
}
