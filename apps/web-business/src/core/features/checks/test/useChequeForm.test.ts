import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Cheque, ChequeFormValues } from '../assets/@types/cheque.types';
import { MOCK_CHEQUE_FORM_RULES } from '../assets/mock/checks.mock';
import { ChequeApiError } from '../lib/checks-api.errors';
import { useChequeForm } from '../hook/useChequeForm';

const EXISTING_CHEQUE: Cheque = {
  id: 'cheque-1001',
  revision: 3,
  number: '100000',
  sayadId: '1200000000000000',
  direction: 'received',
  counterparty: 'شرکت آرمان تجارت',
  bank: 'ملی',
  amount: { amount: '125000000.00', currency: 'IRR' },
  registeredDate: '1405/07/27',
  dueDate: '1405/08/27',
  status: 'pending',
};

function formValues(overrides: Partial<ChequeFormValues> = {}): ChequeFormValues {
  return {
    number: '123456',
    sayadId: '1234567890123456',
    direction: 'received',
    counterparty: 'شرکت آزمون',
    bank: 'ملی',
    amount: '125000000',
    registeredDate: '1405/07/27',
    dueDate: '1405/08/27',
    ...overrides,
  };
}

function setup(cheque: Cheque | null = null, rules = MOCK_CHEQUE_FORM_RULES) {
  const findConflict = vi.fn().mockResolvedValue({ number: null, sayadId: null });
  const onValidSubmit = vi.fn().mockResolvedValue(undefined);
  const view = renderHook(() =>
    useChequeForm({
      cheque,
      rules,
      onValidSubmit,
      conflictApi: { findConflict },
    }),
  );

  act(() => {
    view.result.current.setValues(formValues());
  });

  return { ...view, findConflict, onValidSubmit };
}

describe('useChequeForm', () => {
  it('validates, checks duplicates and submits canonical values', async () => {
    const { result, findConflict, onValidSubmit } = setup();
    let submitted = false;

    await act(async () => {
      submitted = await result.current.submit();
    });

    expect(submitted).toBe(true);
    expect(findConflict).toHaveBeenCalledWith({
      number: '123456',
      bank: 'ملی',
      sayadId: '1234567890123456',
    });
    expect(onValidSubmit).toHaveBeenCalledWith({
      number: '123456',
      sayadId: '1234567890123456',
      direction: 'received',
      counterparty: 'شرکت آزمون',
      bank: 'ملی',
      amount: { amount: '125000000.00', currency: 'IRR' },
      registeredDate: '1405/07/27',
      dueDate: '1405/08/27',
    });
    expect(result.current.formError).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('blocks a due date before the registered date before calling the API', async () => {
    const { result, findConflict, onValidSubmit } = setup();

    act(() => {
      result.current.setValues(formValues({ registeredDate: '1405/08/10', dueDate: '1405/08/09' }));
    });

    let submitted = true;
    await act(async () => {
      submitted = await result.current.submit();
    });

    expect(submitted).toBe(false);
    expect(result.current.errors.dueDate).toContain('قبل از تاریخ ثبت');
    expect(findConflict).not.toHaveBeenCalled();
    expect(onValidSubmit).not.toHaveBeenCalled();
  });

  it('validates the sixteen-digit Sayad locally', async () => {
    const { result, findConflict, onValidSubmit } = setup();

    act(() => {
      result.current.setField('sayadId', '123456789012345');
    });

    let submitted = true;
    await act(async () => {
      submitted = await result.current.submit();
    });

    expect(submitted).toBe(false);
    expect(result.current.errors.sayadId).toContain('۱۶ رقم');
    expect(findConflict).not.toHaveBeenCalled();
    expect(onValidSubmit).not.toHaveBeenCalled();
  });

  it('prevents a duplicate cheque number for the same bank in the form layer', async () => {
    const { result, findConflict, onValidSubmit } = setup();
    findConflict.mockResolvedValue({ number: EXISTING_CHEQUE, sayadId: null });

    let submitted = true;
    await act(async () => {
      submitted = await result.current.submit();
    });

    expect(submitted).toBe(false);
    expect(result.current.errors.number).toBe('چکی با این شماره برای همین بانک قبلاً ثبت شده است.');
    expect(onValidSubmit).not.toHaveBeenCalled();
  });

  it('uses the global duplicate-number wording when the API declares a global scope', async () => {
    const globalRules = {
      ...MOCK_CHEQUE_FORM_RULES,
      duplicateNumberScope: 'global' as const,
    };
    const { result, findConflict, onValidSubmit } = setup(null, globalRules);
    findConflict.mockResolvedValue({ number: EXISTING_CHEQUE, sayadId: null });

    let submitted = true;
    await act(async () => {
      submitted = await result.current.submit();
    });

    expect(submitted).toBe(false);
    expect(result.current.errors.number).toBe('چکی با این شماره قبلاً ثبت شده است.');
    expect(onValidSubmit).not.toHaveBeenCalled();
  });

  it('prevents a duplicate Sayad in the form layer', async () => {
    const { result, findConflict, onValidSubmit } = setup();
    findConflict.mockResolvedValue({ number: null, sayadId: EXISTING_CHEQUE });

    let submitted = true;
    await act(async () => {
      submitted = await result.current.submit();
    });

    expect(submitted).toBe(false);
    expect(result.current.errors.sayadId).toContain('قبلاً ثبت شده');
    expect(onValidSubmit).not.toHaveBeenCalled();
  });

  it('excludes the edited cheque from duplicate checks', async () => {
    const { result, findConflict } = setup(EXISTING_CHEQUE);

    await act(async () => {
      await result.current.submit();
    });

    expect(findConflict).toHaveBeenCalledWith({
      number: '123456',
      bank: 'ملی',
      sayadId: '1234567890123456',
      excludeId: 'cheque-1001',
    });
  });

  it('maps server field errors and stale-revision messages into the form', async () => {
    const fieldErrorSetup = setup();
    fieldErrorSetup.onValidSubmit.mockRejectedValue(
      new ChequeApiError({
        code: 'VALIDATION',
        status: 422,
        message: 'اطلاعات معتبر نیست',
        fieldErrors: { number: 'شماره چک تکراری است.' },
      }),
    );

    await act(async () => {
      await fieldErrorSetup.result.current.submit();
    });

    expect(fieldErrorSetup.result.current.errors.number).toBe('شماره چک تکراری است.');
    expect(fieldErrorSetup.result.current.formError).toBeNull();

    const staleSetup = setup();
    staleSetup.onValidSubmit.mockRejectedValue(
      new ChequeApiError({
        code: 'STALE_REVISION',
        status: 409,
        message: 'این چک هم‌زمان توسط کاربر دیگری تغییر کرده است.',
      }),
    );

    await act(async () => {
      await staleSetup.result.current.submit();
    });

    expect(staleSetup.result.current.formError).toContain('هم‌زمان توسط کاربر دیگری');
  });
});
