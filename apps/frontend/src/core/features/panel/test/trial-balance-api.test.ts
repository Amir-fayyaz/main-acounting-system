import { describe, expect, it } from 'vitest';

import { listTrialBalance } from '../lib/trial-balance-api';

describe('listTrialBalance pagination and noPage', () => {
  it('returns a single page by default with server metadata', async () => {
    const result = await listTrialBalance();
    expect(result.data).toHaveLength(10);
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 10, totalPages: 1 });
  });

  it('slices rows and reports bounds for ordinary pagination', async () => {
    const result = await listTrialBalance({ page: 2, limit: 4 });
    expect(result.data.map((row) => row.code)).toEqual(['۱۳۰۱', '۲۱۰۱', '۳۱۰۱', '۴۱۰۱']);
    expect(result.meta).toEqual({ page: 2, limit: 4, total: 10, totalPages: 3 });
  });

  it('returns the complete dataset when noPage is enabled, ignoring page and limit', async () => {
    const result = await listTrialBalance({ noPage: true, page: 3, limit: 2 });
    expect(result.data).toHaveLength(10);
    expect(result.meta).toEqual({ page: 1, limit: 10, total: 10, totalPages: 1 });
  });

  it('applies search before returning the unpaginated dataset', async () => {
    const result = await listTrialBalance({ noPage: true, search: 'بانک' });
    expect(result.data.map((row) => row.name)).toEqual(['بانک ملت', 'بانک ملی']);
    expect(result.meta).toEqual({ page: 1, limit: 2, total: 2, totalPages: 1 });
  });

  it('returns an empty envelope when a noPage search matches nothing', async () => {
    const result = await listTrialBalance({ noPage: true, search: 'حساب‌ناموجود' });
    expect(result.data).toEqual([]);
    expect(result.meta).toEqual({ page: 1, limit: 0, total: 0, totalPages: 0 });
  });
});
