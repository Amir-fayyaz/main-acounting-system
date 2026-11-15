import { describe, expect, it } from 'vitest';

import type { CreateAccountRequest } from '../assets/@types/account.types';
import { createMockAccountDtos } from '../assets/mock/accounts.mock';
import { createAccountsApi } from '../lib/accounts-api';
import { sumMoney } from '../utils/money';

function freshApi() {
  return createAccountsApi({ latencyMs: 0 });
}

function payload(overrides: Partial<CreateAccountRequest> = {}): CreateAccountRequest {
  return {
    title: 'حساب جاری آزمون',
    type: 'bank',
    bank: 'ملی',
    iban: 'IR123456789012345678901234',
    openingBalance: { amount: '12500000.00', currency: 'IRR' },
    ...overrides,
  };
}

describe('accountsApi.list', () => {
  it('returns the standard paginated envelope with one-based pages', async () => {
    const api = freshApi();
    const firstPage = await api.list();
    const secondPage = await api.list({ page: 2, limit: 20 });

    expect(firstPage.data).toHaveLength(20);
    expect(firstPage.meta).toEqual({ page: 1, limit: 20, total: 26, totalPages: 2 });
    expect(secondPage.data).toHaveLength(6);
    expect(secondPage.meta).toEqual({ page: 2, limit: 20, total: 26, totalPages: 2 });
  });

  it('clamps the page size to 1–100 and falls back to 20', async () => {
    const api = freshApi();

    expect((await api.list({ limit: 500 })).meta.limit).toBe(100);
    expect((await api.list({ limit: 0 })).meta.limit).toBe(20);
    expect((await api.list({ limit: -4 })).meta.limit).toBe(20);
  });

  it('filters by type before paginating', async () => {
    const api = freshApi();
    const bankAccounts = await api.list({ type: 'bank', limit: 50 });
    const cashAccounts = await api.list({ type: 'cash', limit: 50 });
    const pettyCash = await api.list({ type: 'petty-cash', limit: 50 });

    expect(bankAccounts.meta.total).toBe(20);
    expect(bankAccounts.data.every((account) => account.type === 'bank')).toBe(true);
    expect(cashAccounts.meta.total).toBe(4);
    expect(pettyCash.meta.total).toBe(2);
  });

  it('searches across title, bank, IBAN, branch and status labels', async () => {
    const api = freshApi();
    const byTitle = await api.list({ search: 'تنخواه' });
    const byBank = await api.list({ search: 'ملی', type: 'bank' });
    const byStatus = await api.list({ search: 'غیرفعال' });

    expect(byTitle.meta.total).toBe(2);
    expect(byBank.meta.total).toBe(4);
    expect(byBank.data.every((account) => account.bank === 'ملی')).toBe(true);
    expect(byStatus.meta.total).toBe(4);
    expect(byStatus.data.every((account) => account.status === 'inactive')).toBe(true);
  });
});

describe('accountsApi.stats', () => {
  it('aggregates bank and cash balances as canonical money strings', async () => {
    const api = freshApi();
    const dtos = createMockAccountDtos();
    const stats = await api.stats();

    expect(stats.total).toBe(26);
    expect(stats.bankBalance).toEqual({
      amount: sumMoney(dtos.filter((dto) => dto.type === 'bank').map((dto) => dto.balance.amount)),
      currency: 'IRR',
    });
    expect(stats.cashBalance).toEqual({
      amount: sumMoney(dtos.filter((dto) => dto.type !== 'bank').map((dto) => dto.balance.amount)),
      currency: 'IRR',
    });
  });

  it('respects the active filters', async () => {
    const api = freshApi();
    const stats = await api.stats({ type: 'cash' });

    expect(stats.total).toBe(4);
    expect(stats.bankBalance.amount).toBe('0.00');
    expect(stats.cashBalance.amount).not.toBe('0.00');
  });
});

describe('accountsApi.create', () => {
  it('creates a canonical, active bank account and prepends it', async () => {
    const api = freshApi();
    const created = await api.create(
      payload({ iban: 'ir123456789012345678901234', title: '  حساب جاری آزمون  ' }),
    );

    expect(created).toMatchObject({
      title: 'حساب جاری آزمون',
      type: 'bank',
      bank: 'ملی',
      iban: 'IR123456789012345678901234',
      branch: null,
      status: 'active',
      revision: 1,
      balance: { amount: '12500000.00', currency: 'IRR' },
    });

    const listed = await api.list({ search: 'حساب جاری آزمون' });
    expect(listed.meta.total).toBe(1);
    expect(listed.data[0]?.id).toBe(created.id);
  });

  it('drops bank and IBAN for cash and petty-cash accounts', async () => {
    const api = freshApi();
    const created = await api.create(
      payload({
        type: 'petty-cash',
        bank: 'ملی',
        iban: 'IR123456789012345678901234',
        openingBalance: { amount: '0.00', currency: 'IRR' },
      }),
    );

    expect(created.type).toBe('petty-cash');
    expect(created.bank).toBeNull();
    expect(created.iban).toBeNull();
    expect(created.balance.amount).toBe('0.00');
  });

  it('rejects invalid payloads with field errors', async () => {
    const api = freshApi();

    await expect(api.create(payload({ title: '   ' }))).rejects.toMatchObject({
      code: 'VALIDATION',
      status: 422,
      fieldErrors: { title: expect.stringContaining('عنوان') },
    });

    await expect(api.create(payload({ bank: '', iban: '' }))).rejects.toMatchObject({
      fieldErrors: {
        bank: expect.stringContaining('بانک'),
        iban: expect.stringContaining('شبا'),
      },
    });

    await expect(api.create(payload({ iban: 'IR123' }))).rejects.toMatchObject({
      fieldErrors: { iban: expect.stringContaining('۲۴ رقم') },
    });

    await expect(
      api.create(payload({ openingBalance: { amount: '1250000', currency: 'IRR' } })),
    ).rejects.toMatchObject({
      fieldErrors: { openingBalance: expect.stringContaining('موجودی اولیه') },
    });
  });
});
