import { beforeEach, describe, expect, it } from 'vitest';
import {
  createJournalEntry,
  getNextJournalNumber,
  getJournalStats,
  listJournalEntries,
  resetJournalStore,
} from '../lib/journal-api';

describe('journal-api', () => {
  beforeEach(() => {
    resetJournalStore();
  });

  it('lists paginated journal entries', async () => {
    const res = await listJournalEntries({ page: 1, limit: 10 });
    expect(res.data.length).toBe(10);
    expect(res.meta.total).toBe(24);
    expect(res.meta.page).toBe(1);
    expect(res.meta.totalPages).toBe(3);
  });

  it('filters entries by status', async () => {
    const draftRes = await listJournalEntries({ status: 'draft' });
    expect(draftRes.data.every((e) => e.status === 'draft')).toBe(true);

    const balancedRes = await listJournalEntries({ status: 'balanced' });
    expect(balancedRes.data.every((e) => e.status === 'balanced')).toBe(true);
  });

  it('searches entries by term', async () => {
    const res = await listJournalEntries({ search: 'فروش نقدی' });
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data.every((e) => e.description.includes('فروش نقدی'))).toBe(true);
  });

  it('computes stats accurately', async () => {
    const stats = await getJournalStats();
    expect(stats.count).toBe(24);
    expect(stats.draftCount).toBe(3);
    expect(BigInt(stats.totalAmount.split('.')[0])).toBeGreaterThan(BigInt(0));
  });

  it('creates a new entry and updates next journal number', async () => {
    const nextNo = getNextJournalNumber();
    const created = await createJournalEntry({
      number: nextNo,
      date: '۱۴۰۵/۰۸/۰۶',
      description: 'سند تستی',
      amount: '50000000.00',
      currency: 'IRR',
      status: 'balanced',
    });

    expect(created.number).toBe(nextNo);
    expect(created.status).toBe('balanced');

    const list = await listJournalEntries({ limit: 1 });
    expect(list.data[0].id).toBe(created.id);
  });
});
