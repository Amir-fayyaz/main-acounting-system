import { describe, expect, it } from 'vitest';

import type { CreatePosTerminalRequest } from '../assets/@types/pos-terminal.types';
import { createPosApi } from '../lib/pos-api';

function freshApi() {
  return createPosApi({ latencyMs: 0 });
}

function payload(overrides: Partial<CreatePosTerminalRequest> = {}): CreatePosTerminalRequest {
  return {
    title: 'POS آزمون',
    terminalNumber: '99990000',
    merchantNumber: '1234567890',
    bank: 'ملی',
    feePercent: '0.75',
    ...overrides,
  };
}

describe('posApi.list', () => {
  it('returns the standard paginated envelope with one-based pages', async () => {
    const api = freshApi();
    const firstPage = await api.list();
    const secondPage = await api.list({ page: 2, limit: 20 });

    expect(firstPage.data).toHaveLength(20);
    expect(firstPage.meta).toEqual({ page: 1, limit: 20, total: 28, totalPages: 2 });
    expect(secondPage.data).toHaveLength(8);
    expect(secondPage.meta).toEqual({ page: 2, limit: 20, total: 28, totalPages: 2 });
  });

  it('clamps the page size to 1–100 and falls back to 20', async () => {
    const api = freshApi();

    expect((await api.list({ limit: 500 })).meta.limit).toBe(100);
    expect((await api.list({ limit: 0 })).meta.limit).toBe(20);
    expect((await api.list({ limit: -4 })).meta.limit).toBe(20);
  });

  it('filters by status before paginating', async () => {
    const api = freshApi();
    const active = await api.list({ status: 'active', limit: 50 });
    const inactive = await api.list({ status: 'inactive', limit: 50 });

    expect(active.meta.total).toBe(23);
    expect(active.data.every((terminal) => terminal.status === 'active')).toBe(true);
    expect(inactive.meta.total).toBe(5);
    expect(inactive.data.every((terminal) => terminal.status === 'inactive')).toBe(true);
  });

  it('searches across title, terminal number, bank, fee and status labels', async () => {
    const api = freshApi();
    const byBranch = await api.list({ search: 'شعبه ونک' });
    const byTerminal = await api.list({ search: '10000548' });
    const byPersianTerminal = await api.list({ search: '۱۰۰۰۰۵۴۸' });
    const byBank = await api.list({ search: 'ملی' });
    const byStatus = await api.list({ search: 'غیرفعال' });

    expect(byBranch.meta.total).toBe(7);
    expect(byTerminal.meta.total).toBe(1);
    expect(byPersianTerminal.meta.total).toBe(1);
    expect(byBank.meta.total).toBe(6);
    expect(byStatus.meta.total).toBe(5);
  });
});

describe('posApi.findByTerminalNumber', () => {
  it('finds an existing terminal with normalized digits and returns null otherwise', async () => {
    const api = freshApi();
    const existing = await api.findByTerminalNumber('۱۰۰۰۰۰۰۰');
    const missing = await api.findByTerminalNumber('55555555');

    expect(existing?.terminalNumber).toBe('10000000');
    expect(missing).toBeNull();
  });
});

describe('posApi.create', () => {
  it('creates an active terminal and prepends it to the list', async () => {
    const api = freshApi();
    const created = await api.create(payload({ title: '  POS آزمون  ' }));

    expect(created).toMatchObject({
      title: 'POS آزمون',
      terminalNumber: '99990000',
      merchantNumber: '1234567890',
      bank: 'ملی',
      feePercent: '0.75',
      settlementIban: null,
      activatedOn: null,
      status: 'active',
      revision: 1,
    });

    const listed = await api.list({ search: '99990000' });
    expect(listed.meta.total).toBe(1);
    expect(listed.data[0]?.id).toBe(created.id);
  });

  it('allows optional merchant, bank and fee to be empty', async () => {
    const api = freshApi();
    const created = await api.create(
      payload({ merchantNumber: null, bank: null, feePercent: null }),
    );

    expect(created.merchantNumber).toBeNull();
    expect(created.bank).toBeNull();
    expect(created.feePercent).toBeNull();
  });

  it('rejects a duplicate terminal number in any digit form', async () => {
    const api = freshApi();

    await expect(api.create(payload({ terminalNumber: '10000000' }))).rejects.toMatchObject({
      code: 'DUPLICATE_TERMINAL',
      status: 409,
      fieldErrors: { terminalNumber: expect.stringContaining('قبلاً ثبت شده') },
    });

    await expect(api.create(payload({ terminalNumber: '۱۰۰۰۰۰۰۰' }))).rejects.toMatchObject({
      code: 'DUPLICATE_TERMINAL',
      status: 409,
    });
  });

  it('rejects invalid payloads with field errors', async () => {
    const api = freshApi();

    await expect(api.create(payload({ title: '   ' }))).rejects.toMatchObject({
      code: 'VALIDATION',
      status: 422,
      fieldErrors: { title: expect.stringContaining('عنوان') },
    });

    await expect(api.create(payload({ terminalNumber: '' }))).rejects.toMatchObject({
      fieldErrors: { terminalNumber: expect.stringContaining('وارد کنید') },
    });

    await expect(api.create(payload({ terminalNumber: 'abcd' }))).rejects.toMatchObject({
      fieldErrors: { terminalNumber: expect.stringContaining('فقط رقم') },
    });

    await expect(api.create(payload({ merchantNumber: '12a4' }))).rejects.toMatchObject({
      fieldErrors: { merchantNumber: expect.stringContaining('فقط رقم') },
    });

    await expect(api.create(payload({ feePercent: '120' }))).rejects.toMatchObject({
      fieldErrors: { feePercent: expect.stringContaining('۰ تا ۱۰۰') },
    });
  });
});
