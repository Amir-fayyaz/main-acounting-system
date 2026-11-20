import { describe, expect, it } from 'vitest';

import { listAccounts } from '../lib/accounts-api';
import { listAuditEvents } from '../lib/audit-api';
import { listCheques } from '../lib/cheques-api';
import { listInvoices } from '../lib/invoices-api';
import { listJournalEntries } from '../lib/journal-api';
import { listPanelUsers } from '../lib/users-api';
import { listPeople } from '../lib/people-api';

describe('search coverage across panel list APIs', () => {
  it('journal search matches Persian dates', async () => {
    const result = await listJournalEntries({ search: '۱۴۰۵/۰۸/۰۵' });
    expect(result.meta.total).toBe(5);
  });

  it('journal search matches Persian status labels', async () => {
    const result = await listJournalEntries({ search: 'پیش‌نویس' });
    expect(result.meta.total).toBe(4);
    expect(result.data.every((row) => row.status === 'draft')).toBe(true);
  });

  it('accounts search matches Persian status labels', async () => {
    const result = await listAccounts({ search: 'غیرفعال' });
    expect(result.meta.total).toBe(1);
    expect(result.data[0].title).toBe('حساب جاری صادرات');
  });

  it('accounts search matches account titles', async () => {
    const result = await listAccounts({ search: 'صندوق اصلی' });
    expect(result.meta.total).toBe(1);
  });

  it('invoices search matches issue dates', async () => {
    const result = await listInvoices({ search: '۱۴۰۵/۰۸/۰۵' });
    expect(result.meta.total).toBe(4);
  });

  it('cheques search matches due dates', async () => {
    const result = await listCheques({ search: '۱۴۰۵/۰۸/۰۸' });
    expect(result.meta.total).toBe(1);
    expect(result.data[0].direction).toBe('received');
  });

  it('audit search matches occurrence timestamps', async () => {
    const result = await listAuditEvents({ search: '۱۴۰۵/۰۸/۰۵' });
    expect(result.meta.total).toBe(4);
  });

  it('audit search matches Persian result labels', async () => {
    const result = await listAuditEvents({ search: 'ناموفق' });
    expect(result.meta.total).toBe(3);
    expect(result.data.every((row) => row.result === 'failure')).toBe(true);
  });

  it('people search matches Persian kind labels', async () => {
    const result = await listPeople({ search: 'مشتری' });
    expect(result.meta.total).toBe(8);
    expect(result.data.every((row) => row.kind === 'customer' || row.kind === 'both')).toBe(true);
  });

  it('search is trimmed and case-insensitive', async () => {
    const byPaddedTerm = await listAccounts({ search: '  صندوق اصلی  ' });
    expect(byPaddedTerm.meta.total).toBe(1);

    const byUppercaseTerm = await listPanelUsers({ search: 'USER1@EXAMPLE.COM' });
    expect(byUppercaseTerm.meta.total).toBe(1);
    expect(byUppercaseTerm.data[0].name).toBe('علی رضایی');
  });

  it('returns an empty result for a term that matches nothing', async () => {
    const result = await listInvoices({ search: 'چنین-سندی-وجود-ندارد' });
    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
  });
});
