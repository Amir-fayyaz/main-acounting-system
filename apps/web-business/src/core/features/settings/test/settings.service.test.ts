import { describe, expect, it } from 'vitest';

import { getSettings, updateSettings } from '../lib/settings.service';

describe('settings service', () => {
  it('returns the seeded settings document', async () => {
    const settings = await getSettings();

    expect(settings.company.companyName).toBe('شرکت نمونه');
    expect(settings.company.currency).toBe('IRR');
    expect(settings.rules.autoNumbering).toBe(true);
    expect(settings.rules.balanceControl).toBe(true);
    expect(settings.fiscal.periodStatus).toBe('open');
  });

  it('persists company changes for later reads', async () => {
    const updated = await updateSettings({
      company: { companyName: 'شرکت آزمون' },
    });

    expect(updated.company.companyName).toBe('شرکت آزمون');

    const reloaded = await getSettings();
    expect(reloaded.company.companyName).toBe('شرکت آزمون');
  });

  it('persists rule changes without touching the company card', async () => {
    const before = await getSettings();

    const updated = await updateSettings({ rules: { autoNumbering: false } });

    expect(updated.rules.autoNumbering).toBe(false);
    expect(updated.company).toEqual(before.company);
  });

  it('stamps the save time', async () => {
    const before = await getSettings();
    const updated = await updateSettings({ rules: { autoInvoiceJournal: false } });

    expect(updated.rules.autoInvoiceJournal).toBe(false);
    expect(updated.updatedAt).not.toBe(before.updatedAt);
    expect(Number.isNaN(new Date(updated.updatedAt).getTime())).toBe(false);
  });

  it('rejects an invalid patch with a clear message', async () => {
    const rejection = await updateSettings({
      company: { nationalId: '123' },
    }).catch((error: unknown) => error);

    expect(rejection).toBeInstanceOf(Error);
    expect((rejection as Error).message).toContain('شناسه ملی');
  });

  it('does not write anything when validation fails', async () => {
    const before = await getSettings();

    await updateSettings({ company: { companyName: '' } }).catch(() => undefined);

    const after = await getSettings();
    expect(after.company).toEqual(before.company);
  });
});
