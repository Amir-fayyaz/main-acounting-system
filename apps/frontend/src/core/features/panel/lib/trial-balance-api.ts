import type { PaginatedResponse } from '@repo/web';
import type { ListParams, TrialBalanceRow } from '../assets/@types';
import { createMockTrialBalance } from '../assets/mock/finance';
import { filterMockRows, paginateMockRows, waitForMockResponse } from '../assets/mock/mock-utils';

const trialBalance = createMockTrialBalance();

export async function listTrialBalance(
  params: ListParams = {},
): Promise<PaginatedResponse<TrialBalanceRow>> {
  const filtered = filterMockRows(trialBalance, params.search, (row) =>
    [row.code, row.name].join(' '),
  );
  return waitForMockResponse(paginateMockRows(filtered, params));
}
