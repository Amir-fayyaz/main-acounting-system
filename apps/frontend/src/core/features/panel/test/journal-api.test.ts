import { describe, expect, it } from 'vitest';

import { getJournalStats } from '../lib/journal-api';

describe('getJournalStats', () => {
  it('aggregates count, amount total and drafts over the full unpaginated set', async () => {
    const stats = await getJournalStats();

    expect(stats).toEqual({ count: 24, totalAmount: '1680000000.00', draftCount: 4 });
  });

  it('scopes the aggregate to the search term like the list endpoint', async () => {
    const stats = await getJournalStats({ search: '۱۴۰۵/۰۸/۰۵' });

    expect(stats).toEqual({ count: 5, totalAmount: '305000000.00', draftCount: 1 });
  });

  it('scopes the aggregate to the status filter', async () => {
    const stats = await getJournalStats({ status: 'draft' });

    expect(stats.count).toBe(4);
    expect(stats.draftCount).toBe(4);
  });

  it('returns zeros when nothing matches the filters', async () => {
    const stats = await getJournalStats({ search: 'چنین-سندی-وجود-ندارد' });

    expect(stats).toEqual({ count: 0, totalAmount: '0', draftCount: 0 });
  });
});
