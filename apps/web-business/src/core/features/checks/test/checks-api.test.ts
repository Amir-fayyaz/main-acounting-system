import { describe, expect, it } from 'vitest';

import type { CreateChequeRequest } from '../assets/@types/cheque.types';
import { createChecksApi } from '../lib/checks-api';

function freshApi() {
  return createChecksApi({ latencyMs: 0 });
}

function payload(overrides: Partial<CreateChequeRequest> = {}): CreateChequeRequest {
  return {
    number: '555555',
    sayadId: '1111222233334444',
    direction: 'received',
    counterparty: 'شرکت آزمون',
    bank: 'ملی',
    amount: { amount: '1000000.00', currency: 'IRR' },
    registeredDate: '1405/07/27',
    dueDate: '1405/08/27',
    ...overrides,
  };
}

describe('checksApi.list', () => {
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

  it('filters by status and direction before paginating', async () => {
    const api = freshApi();
    const overdue = await api.list({ status: 'overdue' });
    const pendingReceived = await api.list({ status: 'pending', direction: 'received' });

    expect(overdue.meta.total).toBe(5);
    expect(overdue.data.every((cheque) => cheque.status === 'overdue')).toBe(true);
    expect(pendingReceived.meta.total).toBe(3);
    expect(
      pendingReceived.data.every(
        (cheque) => cheque.status === 'pending' && cheque.direction === 'received',
      ),
    ).toBe(true);
  });

  it('searches across number, Sayad, counterparty and bank with Persian/Arabic digits', async () => {
    const api = freshApi();
    const byNumber = await api.list({ search: '۱۰۰۰۰۰' });
    const byCounterparty = await api.list({ search: 'آرمان' });

    expect(byNumber.data[0]?.number).toBe('100000');
    expect(byCounterparty.meta.total).toBeGreaterThan(0);
    expect(byCounterparty.data.every((cheque) => cheque.counterparty.includes('آرمان'))).toBe(true);
  });
});

describe('checksApi.stats', () => {
  it('aggregates the full filtered set before pagination', async () => {
    const api = freshApi();
    const stats = await api.stats();
    const filtered = await api.stats({ direction: 'received', status: 'pending' });

    expect(stats).toEqual({ total: 28, received: 14, issued: 14, overdue: 5 });
    expect(filtered).toEqual({ total: 3, received: 3, issued: 0, overdue: 0 });
  });
});

describe('checksApi.getFormRules and findConflict', () => {
  it('exposes the API-owned Sayad and cheque-number rules', async () => {
    const api = freshApi();
    const rules = await api.getFormRules();

    expect(rules.sayad.length).toBe(16);
    expect(rules.chequeNumber).toMatchObject({ minLength: 4, maxLength: 12 });
    expect(rules.duplicateNumberScope).toBe('bank');
  });

  it('finds duplicates by number+bank and by Sayad, ignoring the edited row', async () => {
    const api = freshApi();
    const existing = await api.findConflict({
      number: '100000',
      bank: 'ملی',
      sayadId: '1200000000000000',
    });

    expect(existing.number?.id).toBe('cheque-1001');
    expect(existing.sayadId?.id).toBe('cheque-1001');

    const otherBank = await api.findConflict({
      number: '100000',
      bank: 'ملت',
      sayadId: '9999999999999999',
    });
    expect(otherBank.number).toBeNull();
    expect(otherBank.sayadId).toBeNull();

    const self = await api.findConflict({
      number: '100000',
      bank: 'ملی',
      sayadId: '1200000000000000',
      excludeId: 'cheque-1001',
    });
    expect(self.number).toBeNull();
    expect(self.sayadId).toBeNull();
  });
});

describe('checksApi.create', () => {
  it('accepts a valid cheque and prepends it to the list', async () => {
    const api = freshApi();
    const created = await api.create(payload());

    expect(created).toMatchObject({
      number: '555555',
      sayadId: '1111222233334444',
      revision: 1,
      status: 'pending',
      amount: { amount: '1000000.00', currency: 'IRR' },
    });

    const listed = await api.list({ search: '555555' });
    expect(listed.meta.total).toBe(1);
    expect(listed.data[0]?.id).toBe(created.id);
  });

  it('rejects a duplicate number only within the same bank', async () => {
    const api = freshApi();

    await expect(api.create(payload({ number: '100000', bank: 'ملی' }))).rejects.toMatchObject({
      code: 'DUPLICATE_NUMBER',
      status: 409,
      fieldErrors: { number: expect.stringContaining('قبلاً ثبت شده') },
    });

    const otherBank = await api.create(payload({ number: '100000', bank: 'ملت' }));
    expect(otherBank.number).toBe('100000');
    expect(otherBank.bank).toBe('ملت');
  });

  it('rejects a duplicate Sayad globally', async () => {
    const api = freshApi();

    await expect(
      api.create(payload({ sayadId: '1200000000000000', bank: 'سامان' })),
    ).rejects.toMatchObject({
      code: 'DUPLICATE_SAYAD',
      status: 409,
      fieldErrors: { sayadId: expect.stringContaining('قبلاً ثبت شده') },
    });
  });

  it('rejects a due date before the registered date and invalid Sayad values', async () => {
    const api = freshApi();

    await expect(
      api.create(payload({ registeredDate: '1405/08/10', dueDate: '1405/08/09' })),
    ).rejects.toMatchObject({
      code: 'VALIDATION',
      status: 422,
      fieldErrors: { dueDate: expect.stringContaining('قبل از تاریخ ثبت') },
    });

    await expect(api.create(payload({ sayadId: '12345' }))).rejects.toMatchObject({
      code: 'VALIDATION',
      fieldErrors: { sayadId: expect.stringContaining('۱۶ رقم') },
    });
  });
});

describe('checksApi.update', () => {
  it('increments the revision and rejects a stale expectedRevision', async () => {
    const api = freshApi();
    const { data } = await api.list();
    const target = data[0];
    expect(target).toBeDefined();
    if (!target) return;

    const updated = await api.update({
      id: target.id,
      expectedRevision: target.revision,
      number: target.number,
      sayadId: target.sayadId,
      direction: target.direction,
      counterparty: 'طرف حساب ویرایش‌شده',
      bank: target.bank,
      amount: target.amount,
      registeredDate: target.registeredDate,
      dueDate: target.dueDate,
    });

    expect(updated.revision).toBe(target.revision + 1);
    expect(updated.counterparty).toBe('طرف حساب ویرایش‌شده');

    await expect(
      api.update({
        id: target.id,
        expectedRevision: target.revision,
        number: target.number,
        sayadId: target.sayadId,
        direction: target.direction,
        counterparty: 'ویرایش دوباره',
        bank: target.bank,
        amount: target.amount,
        registeredDate: target.registeredDate,
        dueDate: target.dueDate,
      }),
    ).rejects.toMatchObject({ code: 'STALE_REVISION', status: 409 });
  });

  it('does not treat the edited row itself as a duplicate', async () => {
    const api = freshApi();
    const { data } = await api.list();
    const target = data[0];
    expect(target).toBeDefined();
    if (!target) return;

    const updated = await api.update({
      id: target.id,
      expectedRevision: target.revision,
      number: target.number,
      sayadId: target.sayadId,
      direction: target.direction,
      counterparty: target.counterparty,
      bank: target.bank,
      amount: target.amount,
      registeredDate: target.registeredDate,
      dueDate: target.dueDate,
    });

    expect(updated.id).toBe(target.id);
  });
});
