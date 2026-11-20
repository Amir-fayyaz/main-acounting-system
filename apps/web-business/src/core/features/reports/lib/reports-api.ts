import type { ReportGroup } from '../assets/@types/reports';
import { reportGroups } from '../assets/mock/reports';
import { waitForMockResponse } from '../../shared';

export async function listReportGroups(): Promise<readonly ReportGroup[]> {
  return waitForMockResponse(reportGroups);
}

export function findReport(
  reportGroups: readonly ReportGroup[],
  reportId: string,
): string | null {
  for (const group of reportGroups) {
    const report = group.items.find((item) => item.id === reportId);
    if (report) return report.label;
  }
  return null;
}
