import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PosApiError } from '../lib/pos-api.errors';
import { usePosTerminalForm } from '../hook/usePosTerminalForm';

function duplicateApi(existing: boolean) {
  return {
    findByTerminalNumber: vi.fn().mockResolvedValue(
      existing
        ? {
            id: 'pos-1001',
            revision: 1,
            title: 'POS موجود',
            terminalNumber: '10000000',
            merchantNumber: null,
            bank: null,
            feePercent: null,
            settlementIban: null,
            activatedOn: null,
            status: 'active',
          }
        : null,
    ),
  };
}

describe('usePosTerminalForm', () => {
  it('blocks submit and exposes validation errors for an empty form', async () => {
    const onValidSubmit = vi.fn();
    const { result } = renderHook(() =>
      usePosTerminalForm({ onValidSubmit, duplicateApi: duplicateApi(false) }),
    );

    let isSaved = true;
    await act(async () => {
      isSaved = await result.current.submit();
    });

    expect(isSaved).toBe(false);
    expect(onValidSubmit).not.toHaveBeenCalled();
    expect(result.current.errors.title).toBeDefined();
    expect(result.current.errors.terminalNumber).toBeDefined();
  });

  it('submits a canonical payload for a valid terminal', async () => {
    const onValidSubmit = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      usePosTerminalForm({ onValidSubmit, duplicateApi: duplicateApi(false) }),
    );

    act(() => {
      result.current.setField('title', 'POS جدید');
      result.current.setField('terminalNumber', '۹۹۹۹۰۰۰۰');
      result.current.setField('merchantNumber', '1234567890');
      result.current.setField('bank', 'ملی');
      result.current.setField('feePercent', '۰٫۷');
    });

    let isSaved = false;
    await act(async () => {
      isSaved = await result.current.submit();
    });

    expect(isSaved).toBe(true);
    expect(onValidSubmit).toHaveBeenCalledWith({
      title: 'POS جدید',
      terminalNumber: '99990000',
      merchantNumber: '1234567890',
      bank: 'ملی',
      feePercent: '0.70',
    });
  });

  it('blocks a duplicate terminal before calling the create API', async () => {
    const onValidSubmit = vi.fn();
    const { result } = renderHook(() =>
      usePosTerminalForm({ onValidSubmit, duplicateApi: duplicateApi(true) }),
    );

    act(() => {
      result.current.setField('title', 'POS تکراری');
      result.current.setField('terminalNumber', '10000000');
    });

    let isSaved = true;
    await act(async () => {
      isSaved = await result.current.submit();
    });

    expect(isSaved).toBe(false);
    expect(onValidSubmit).not.toHaveBeenCalled();
    expect(result.current.errors.terminalNumber).toContain('قبلاً ثبت شده');
  });

  it('maps API field errors back onto the form', async () => {
    const onValidSubmit = vi.fn().mockRejectedValue(
      new PosApiError({
        code: 'VALIDATION',
        status: 422,
        message: 'اطلاعات ترمینال معتبر نیست.',
        fieldErrors: { title: 'عنوان تکراری است.' },
      }),
    );
    const { result } = renderHook(() =>
      usePosTerminalForm({ onValidSubmit, duplicateApi: duplicateApi(false) }),
    );

    act(() => {
      result.current.setField('title', 'POS');
      result.current.setField('terminalNumber', '12345678');
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.errors.title).toBe('عنوان تکراری است.');
    expect(result.current.formError).toBeNull();
  });
});
