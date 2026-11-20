export interface TrialBalanceRow {
  id: string;
  code: string;
  name: string;
  debit: string;
  credit: string;
  currency: 'IRR';
}

export interface TrialBalanceSummary {
  totalDebit: string;
  totalCredit: string;
  isBalanced: boolean;
  difference: string;
}

export interface ListTrialParams {
  search?: string;
}
