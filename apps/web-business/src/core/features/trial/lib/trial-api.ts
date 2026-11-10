import type { ListTrialParams, TrialBalanceRow, TrialBalanceSummary } from '../assets/@types';
import { createInitialTrialBalance } from '../assets/mock/trial';

let trialRows = createInitialTrialBalance();

export function resetTrialStore(): void {
  trialRows = createInitialTrialBalance();
}

export function computeTrialSummary(rows: TrialBalanceRow[]): TrialBalanceSummary {
  let totalDebitBig = BigInt(0);
  let totalCreditBig = BigInt(0);

  for (const row of rows) {
    const d = BigInt(row.debit.split('.')[0] || '0');
    const c = BigInt(row.credit.split('.')[0] || '0');
    totalDebitBig += d;
    totalCreditBig += c;
  }

  const diffBig =
    totalDebitBig > totalCreditBig
      ? totalDebitBig - totalCreditBig
      : totalCreditBig - totalDebitBig;

  return {
    totalDebit: `${totalDebitBig.toString()}.00`,
    totalCredit: `${totalCreditBig.toString()}.00`,
    isBalanced: totalDebitBig === totalCreditBig && totalDebitBig > BigInt(0),
    difference: `${diffBig.toString()}.00`,
  };
}

export async function listTrialBalance(
  params: ListTrialParams = {},
): Promise<{ data: TrialBalanceRow[]; summary: TrialBalanceSummary }> {
  let data = [...trialRows];

  if (params.search && params.search.trim() !== '') {
    const term = params.search.trim().toLowerCase();
    data = data.filter(
      (row) => row.code.toLowerCase().includes(term) || row.name.toLowerCase().includes(term),
    );
  }

  const summary = computeTrialSummary(data);

  return {
    data,
    summary,
  };
}
