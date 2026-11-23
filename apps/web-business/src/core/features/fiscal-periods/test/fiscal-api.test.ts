import { describe, expect, it, vi } from 'vitest';
import * as apiModule from '@repo/web/api';
import {
  closeFiscalPeriodApi,
  createFiscalYearApi,
  getActiveTenantId,
  listFiscalPeriodsApi,
  listFiscalYearsApi,
  mapFiscalErrorMessage,
  reopenFiscalPeriodApi,
  selectActivePeriodApi,
  setActiveTenantId,
} from '../lib/fiscal-api';
import { FISCAL_ERROR_CODES } from '../assets/@types/fiscal-api.types';

describe('fiscal-api', () => {
  it('manages active tenant ID in localStorage', () => {
    setActiveTenantId('custom-tenant-123');
    expect(getActiveTenantId()).toBe('custom-tenant-123');
  });

  it('translates domain error codes to Persian user-facing messages', () => {
    expect(mapFiscalErrorMessage({ code: FISCAL_ERROR_CODES.YEAR_OVERLAP }, 'خطا')).toContain(
      'هم‌پوشانی',
    );

    expect(
      mapFiscalErrorMessage({ code: FISCAL_ERROR_CODES.YEAR_LABEL_DUPLICATE }, 'خطا'),
    ).toContain('تکراری');

    expect(
      mapFiscalErrorMessage({ code: FISCAL_ERROR_CODES.REOPEN_REASON_REQUIRED }, 'خطا'),
    ).toContain('دلیل مستند');

    expect(
      mapFiscalErrorMessage({ code: FISCAL_ERROR_CODES.PERIOD_STATE_INVALID }, 'خطا'),
    ).toContain('دوره‌ی فعال');

    expect(mapFiscalErrorMessage(new Error('خطای ناشناخته'), 'خطای عمومی')).toBe('خطای ناشناخته');
  });

  it('calls apiRequest with correct endpoints and parameters', async () => {
    const apiRequestSpy = vi.spyOn(apiModule, 'apiRequest').mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    } as any);

    await listFiscalYearsApi('test-tenant', { page: 1, limit: 10 });
    expect(apiRequestSpy).toHaveBeenCalledWith(
      '/tenants/test-tenant/fiscal-years?page=1&limit=10',
      expect.objectContaining({ method: 'GET' }),
    );

    apiRequestSpy.mockResolvedValueOnce({ id: 'new-year-id' } as any);
    await createFiscalYearApi('test-tenant', {
      label: 'FY1405',
      startDate: '2026-03-21',
      endDate: '2027-03-20',
    });
    expect(apiRequestSpy).toHaveBeenCalledWith(
      '/tenants/test-tenant/fiscal-years',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          label: 'FY1405',
          startDate: '2026-03-21',
          endDate: '2027-03-20',
        }),
      }),
    );

    apiRequestSpy.mockResolvedValueOnce({ id: 'p1' } as any);
    await selectActivePeriodApi('test-tenant', 'period-1');
    expect(apiRequestSpy).toHaveBeenCalledWith(
      '/tenants/test-tenant/fiscal-periods/period-1/select-active',
      expect.objectContaining({ method: 'POST' }),
    );

    apiRequestSpy.mockResolvedValueOnce({ id: 'p1' } as any);
    await closeFiscalPeriodApi('test-tenant', 'period-1');
    expect(apiRequestSpy).toHaveBeenCalledWith(
      '/tenants/test-tenant/fiscal-periods/period-1/close',
      expect.objectContaining({ method: 'POST' }),
    );

    apiRequestSpy.mockResolvedValueOnce({ id: 'p1' } as any);
    await reopenFiscalPeriodApi('test-tenant', 'period-1', { reason: 'توضیحات بازگشایی' });
    expect(apiRequestSpy).toHaveBeenCalledWith(
      '/tenants/test-tenant/fiscal-periods/period-1/reopen',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reason: 'توضیحات بازگشایی' }),
      }),
    );

    apiRequestSpy.mockRestore();
  });
});
