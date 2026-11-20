import { beforeEach, describe, expect, it } from 'vitest';
import { computeTrialSummary, listTrialBalance, resetTrialStore } from '../lib/trial-api';

describe('trial-api', () => {
  beforeEach(() => {
    resetTrialStore();
  });

  it('lists trial balance rows with summary', async () => {
    const res = await listTrialBalance();
    expect(res.data.length).toBe(10);
    expect(res.summary.isBalanced).toBe(true);
    expect(res.summary.difference).toBe('0.00');
    expect(res.summary.totalDebit).toBe(res.summary.totalCredit);
  });

  it('filters rows by search term', async () => {
    const res = await listTrialBalance({ search: 'صندوق' });
    expect(res.data.length).toBe(1);
    expect(res.data[0].name).toBe('صندوق');
    expect(res.data[0].code).toBe('۱۱۰۱');
  });

  it('computes unbalanced summary correctly', () => {
    const summary = computeTrialSummary([
      {
        id: '1',
        code: '101',
        name: 'حساب الف',
        debit: '1000.00',
        credit: '0.00',
        currency: 'IRR',
      },
      {
        id: '2',
        code: '102',
        name: 'حساب ب',
        debit: '0.00',
        credit: '800.00',
        currency: 'IRR',
      },
    ]);

    expect(summary.isBalanced).toBe(false);
    expect(summary.difference).toBe('200.00');
  });
});
