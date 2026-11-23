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
import {
  FISCAL_ERROR_CODES,
  type FiscalPaginatedResponse,
  type FiscalPeriodResponseDto,
  type FiscalYearResponseDto,
} from '../assets/@types/fiscal-api.types';

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
    const dummyPaginatedYears: FiscalPaginatedResponse<FiscalYearResponseDto> = {
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
    const dummyYearDto: FiscalYearResponseDto = {
      id: 'new-year-id',
      tenantId: 'test-tenant',
      label: 'FY1405',
      startDate: '2026-03-21',
      endDate: '2027-03-20',
      status: 'open',
      revision: 1,
      createdAt: '2026-03-21T00:00:00.000Z',
      updatedAt: '2026-03-21T00:00:00.000Z',
    };
    const dummyPeriodDto: FiscalPeriodResponseDto = {
      id: 'p1',
      tenantId: 'test-tenant',
      fiscalYearId: 'new-year-id',
      jalaliYear: 1405,
      sequence: 1,
      startDate: '2026-03-21',
      endDate: '2026-04-20',
      state: 'open',
      createdAt: '2026-03-21T00:00:00.000Z',
      updatedAt: '2026-03-21T00:00:00.000Z',
    };
    const dummyPaginatedPeriods: FiscalPaginatedResponse<FiscalPeriodResponseDto> = {
      data: [dummyPeriodDto],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };

    const apiRequestSpy = vi
      .spyOn(apiModule, 'apiRequest')
      .mockImplementation(async () => dummyPaginatedYears as never);

    await listFiscalYearsApi('test-tenant', { page: 1, limit: 10 });
    expect(apiRequestSpy).toHaveBeenCalledWith(
      '/tenants/test-tenant/fiscal-years?page=1&limit=10',
      expect.objectContaining({ method: 'GET' }),
    );

    apiRequestSpy.mockImplementationOnce(async () => dummyYearDto as never);
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

    apiRequestSpy.mockImplementationOnce(async () => dummyPaginatedPeriods as never);
    await listFiscalPeriodsApi('test-tenant', 'new-year-id', { page: 1, limit: 50 });
    expect(apiRequestSpy).toHaveBeenCalledWith(
      '/tenants/test-tenant/fiscal-years/new-year-id/periods?page=1&limit=50',
      expect.objectContaining({ method: 'GET' }),
    );

    apiRequestSpy.mockImplementationOnce(async () => dummyPeriodDto as never);
    await selectActivePeriodApi('test-tenant', 'period-1');
    expect(apiRequestSpy).toHaveBeenCalledWith(
      '/tenants/test-tenant/fiscal-periods/period-1/select-active',
      expect.objectContaining({ method: 'POST' }),
    );

    apiRequestSpy.mockImplementationOnce(async () => dummyPeriodDto as never);
    await closeFiscalPeriodApi('test-tenant', 'period-1');
    expect(apiRequestSpy).toHaveBeenCalledWith(
      '/tenants/test-tenant/fiscal-periods/period-1/close',
      expect.objectContaining({ method: 'POST' }),
    );

    apiRequestSpy.mockImplementationOnce(async () => dummyPeriodDto as never);
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
