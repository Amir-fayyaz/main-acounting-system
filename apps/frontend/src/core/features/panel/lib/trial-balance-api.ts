import type { PaginatedResponse } from '@repo/web';
import type { ListParams, TrialBalanceRow } from '../assets/@types';
import { createMockTrialBalance } from '../assets/mock/finance';
import { listMockRows } from './mock-api-utils';

const trialBalance = createMockTrialBalance();

export async function listTrialBalance(
  params: ListParams = {},
): Promise<PaginatedResponse<TrialBalanceRow>> {
  return listMockRows(trialBalance, params, {
    getSearchText: (row) => [row.code, row.name].join(' '),
  });
}
