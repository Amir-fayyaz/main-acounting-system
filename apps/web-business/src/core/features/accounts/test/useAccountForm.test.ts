import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AccountApiError } from '../lib/accounts-api.errors';
import { useAccountForm } from '../hook/useAccountForm';

describe('useAccountForm', () => {
  it('blocks submit and exposes validation errors for an empty form', async () => {
    const onValidSubmit = vi.fn();
    const { result } = renderHook(() => useAccountForm({ onValidSubmit }));

    let isSaved = true;
    await act(async () => {
      isSaved = await result.current.submit();
    });

    expect(isSaved).toBe(false);
    expect(onValidSubmit).not.toHaveBeenCalled();
    expect(result.current.errors.title).toBeDefined();
    expect(result.current.errors.bank).toBeDefined();
    expect(result.current.errors.iban).toBeDefined();
  });

  it('submits a canonical payload for a valid bank account', async () => {
    const onValidSubmit = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAccountForm({ onValidSubmit }));

    act(() => {
      result.current.setField('title', 'حساب جاری جدید');
      result.current.setField('bank', 'ملی');
      result.current.setField('iban', 'ir123456789012345678901234');
      result.current.setField('openingBalance', '۱۲۵٬۰۰۰٬۰۰۰');
    });

    let isSaved = false;
    await act(async () => {
      isSaved = await result.current.submit();
    });

    expect(isSaved).toBe(true);
    expect(onValidSubmit).toHaveBeenCalledWith({
      title: 'حساب جاری جدید',
      type: 'bank',
      bank: 'ملی',
      iban: 'IR123456789012345678901234',
      openingBalance: { amount: '125000000.00', currency: 'IRR' },
    });
  });

  it('maps API field errors back onto the form', async () => {
    const onValidSubmit = vi.fn().mockRejectedValue(
      new AccountApiError({
        code: 'VALIDATION',
        status: 422,
        message: 'اطلاعات حساب معتبر نیست.',
        fieldErrors: { title: 'این عنوان قبلاً استفاده شده است.' },
      }),
    );
    const { result } = renderHook(() => useAccountForm({ onValidSubmit }));

    act(() => {
      result.current.setField('title', 'حساب تکراری');
      result.current.setField('bank', 'ملی');
      result.current.setField('iban', 'IR123456789012345678901234');
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.errors.title).toBe('این عنوان قبلاً استفاده شده است.');
    expect(result.current.formError).toBeNull();
  });
});
