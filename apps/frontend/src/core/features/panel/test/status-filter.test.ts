import { describe, expect, it } from 'vitest';

import { listAccounts } from '../lib/accounts-api';
import { listAuditEvents } from '../lib/audit-api';
import { listBranches } from '../lib/branches-api';
import { listCheques } from '../lib/cheques-api';
import { listInvoices } from '../lib/invoices-api';
import { listJournalEntries } from '../lib/journal-api';
import { listPanelUsers } from '../lib/users-api';
import { listPosTerminals } from '../lib/pos-api';
import { listPurchases } from '../lib/purchases-api';

describe('status filtering across panel list APIs', () => {
  it('filters journal entries by status', async () => {
    const result = await listJournalEntries({ status: 'draft' });
    expect(result.meta.total).toBe(4);
    expect(result.data.every((row) => row.status === 'draft')).toBe(true);
  });

  it('filters bank accounts by status', async () => {
    const inactive = await listAccounts({ status: 'inactive' });
    expect(inactive.meta.total).toBe(1);
    expect(inactive.data[0].title).toBe('حساب جاری صادرات');

    const active = await listAccounts({ status: 'active' });
    expect(active.meta.total).toBe(7);
  });

  it('filters cheques by status', async () => {
    const result = await listCheques({ status: 'collected' });
    expect(result.meta.total).toBe(3);
    expect(result.data.every((row) => row.status === 'collected')).toBe(true);
  });

  it('filters POS terminals by status', async () => {
    const result = await listPosTerminals({ status: 'inactive' });
    expect(result.meta.total).toBe(1);
  });

  it('filters sales invoices by payment status', async () => {
    const result = await listInvoices({ status: 'settled' });
    expect(result.meta.total).toBe(6);
    expect(result.data.every((row) => row.status === 'settled')).toBe(true);
  });

  it('filters purchases by payment status', async () => {
    const result = await listPurchases({ status: 'unsettled' });
    expect(result.meta.total).toBe(5);
    expect(result.data.every((row) => row.status === 'unsettled')).toBe(true);
  });

  it('filters branches and users by status', async () => {
    const branches = await listBranches({ status: 'inactive' });
    expect(branches.meta.total).toBe(1);

    const users = await listPanelUsers({ status: 'inactive' });
    expect(users.meta.total).toBe(1);
  });

  it('filters audit events by result through the status param', async () => {
    const result = await listAuditEvents({ status: 'failure' });
    expect(result.meta.total).toBe(3);
    expect(result.data.every((row) => row.result === 'failure')).toBe(true);
  });

  it('combines search and status filtering before pagination', async () => {
    const page1 = await listJournalEntries({
      search: 'فروش',
      status: 'balanced',
      page: 1,
      limit: 2,
    });
    expect(page1.data).toHaveLength(2);
    expect(page1.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });

    const page2 = await listJournalEntries({
      search: 'فروش',
      status: 'balanced',
      page: 2,
      limit: 2,
    });
    expect(page2.data).toHaveLength(1);
    expect(page2.meta.total).toBe(3);
  });
});
