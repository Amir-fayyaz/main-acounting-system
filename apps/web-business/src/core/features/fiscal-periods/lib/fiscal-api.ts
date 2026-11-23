import { apiRequest } from '@repo/web/api';
import { getAccessToken } from '@repo/web/session/cookie';

import type {
  CreateFiscalYearPayload,
  FiscalPeriodDto,
  FiscalYearDto,
  ListQueryParams,
  PaginatedDto,
  ReopenFiscalPeriodPayload,
} from '../assets/@types/fiscal-api.types';
import { FISCAL_ERROR_CODES } from '../assets/@types/fiscal-api.types';

export const DEFAULT_TENANT_FIXTURE = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';

/**
 * Resolves the active tenant ID for API requests.
 */
export function getActiveTenantId(): string {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('active_tenant_id');
      if (stored && stored.trim() !== '') return stored.trim();
    } catch {
      // ignore
    }
  }
  return DEFAULT_TENANT_FIXTURE;
}

/**
 * Stores the active tenant ID in localStorage for client-side API requests.
 */
export function setActiveTenantId(tenantId: string): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('active_tenant_id', tenantId);
    } catch {
      // ignore
    }
  }
}

function getAuthHeaders(customToken?: string): Record<string, string> {
  const token = customToken || (typeof window !== 'undefined' ? getAccessToken() : null);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Translates backend domain error codes to user-facing Persian messages.
 */
export function mapFiscalErrorMessage(error: unknown, fallbackMessage: string): string {
  if (typeof error === 'object' && error !== null) {
    const errObj = error as { code?: string; message?: string };
    if (errObj.code) {
      switch (errObj.code) {
        case FISCAL_ERROR_CODES.YEAR_OVERLAP:
          return 'یک سال مالی دیگر از این شرکت در این بازه تاریخی تعریف شده است و دارای هم‌پوشانی است.';
        case FISCAL_ERROR_CODES.YEAR_LABEL_DUPLICATE:
          return 'عنوان سال مالی تکراری است. سال مالی دیگری با این عنوان قبلاً ثبت شده است.';
        case FISCAL_ERROR_CODES.YEAR_INVALID_RANGE:
          return 'تاریخ شروع سال مالی باید قبل از تاریخ پایان باشد.';
        case FISCAL_ERROR_CODES.PERIOD_STRUCTURE:
          return 'سال مالی باید دقیقاً یک سال کامل هجری شمسی (از ۱ فروردین تا آخرین روز اسفند) باشد.';
        case FISCAL_ERROR_CODES.PERIOD_STATE_INVALID:
          return 'تغییر وضعیت دوره ممکن نیست (دوره‌ی فعال را نمی‌توان بست؛ ابتدا دوره‌ی دیگری را انتخاب کنید).';
        case FISCAL_ERROR_CODES.PERIOD_NOT_OPEN:
          return 'تنها یک دوره‌ی باز می‌تواند به عنوان دوره‌ی فعال انتخاب شود.';
        case FISCAL_ERROR_CODES.REOPEN_REASON_REQUIRED:
          return 'ارائه دلیل مستند جهت بازگشایی دوره الزامی است.';
        case FISCAL_ERROR_CODES.YEAR_NOT_FOUND:
          return 'سال مالی مورد نظر یافت نشد.';
        case FISCAL_ERROR_CODES.PERIOD_NOT_FOUND:
          return 'دوره مالی مورد نظر یافت نشد.';
        case FISCAL_ERROR_CODES.PERMISSION_REQUIRED:
          return 'شما مجوز مدیریت دوره‌ها و سال‌های مالی (accounting.period.manage) را ندارید.';
        case FISCAL_ERROR_CODES.TENANT_ACCESS_DENIED:
          return 'دسترسی به اطلاعات مالی این مجموعه امکان‌پذیر نیست.';
      }
    }
    if (errObj.message) {
      return errObj.message;
    }
  }

  return fallbackMessage;
}

/**
 * GET /api/v1/tenants/:tenantId/fiscal-years
 */
export async function listFiscalYearsApi(
  tenantId: string = getActiveTenantId(),
  params: ListQueryParams = {},
  token?: string,
): Promise<PaginatedDto<FiscalYearDto>> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.limit !== undefined) query.set('limit', String(params.limit));

  const queryStr = query.toString() ? `?${query.toString()}` : '';
  const path = `/tenants/${encodeURIComponent(tenantId)}/fiscal-years${queryStr}`;

  return apiRequest(path, {
    method: 'GET',
    headers: getAuthHeaders(token),
  }) as Promise<PaginatedDto<FiscalYearDto>>;
}

/**
 * POST /api/v1/tenants/:tenantId/fiscal-years
 */
export async function createFiscalYearApi(
  tenantId: string = getActiveTenantId(),
  payload: CreateFiscalYearPayload,
  token?: string,
): Promise<FiscalYearDto> {
  const path = `/tenants/${encodeURIComponent(tenantId)}/fiscal-years`;

  return apiRequest(path, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  }) as Promise<FiscalYearDto>;
}

/**
 * GET /api/v1/tenants/:tenantId/fiscal-years/:fiscalYearId
 */
export async function getFiscalYearApi(
  tenantId: string = getActiveTenantId(),
  fiscalYearId: string,
  token?: string,
): Promise<FiscalYearDto> {
  const path = `/tenants/${encodeURIComponent(tenantId)}/fiscal-years/${encodeURIComponent(fiscalYearId)}`;

  return apiRequest(path, {
    method: 'GET',
    headers: getAuthHeaders(token),
  }) as Promise<FiscalYearDto>;
}

/**
 * GET /api/v1/tenants/:tenantId/fiscal-years/:fiscalYearId/periods
 */
export async function listFiscalPeriodsApi(
  tenantId: string = getActiveTenantId(),
  fiscalYearId: string,
  params: ListQueryParams = {},
  token?: string,
): Promise<PaginatedDto<FiscalPeriodDto>> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.limit !== undefined) query.set('limit', String(params.limit));

  const queryStr = query.toString() ? `?${query.toString()}` : '';
  const path = `/tenants/${encodeURIComponent(tenantId)}/fiscal-years/${encodeURIComponent(fiscalYearId)}/periods${queryStr}`;

  return apiRequest(path, {
    method: 'GET',
    headers: getAuthHeaders(token),
  }) as Promise<PaginatedDto<FiscalPeriodDto>>;
}

/**
 * POST /api/v1/tenants/:tenantId/fiscal-periods/:periodId/select-active
 */
export async function selectActivePeriodApi(
  tenantId: string = getActiveTenantId(),
  periodId: string,
  token?: string,
): Promise<FiscalPeriodDto> {
  const path = `/tenants/${encodeURIComponent(tenantId)}/fiscal-periods/${encodeURIComponent(periodId)}/select-active`;

  return apiRequest(path, {
    method: 'POST',
    headers: getAuthHeaders(token),
  }) as Promise<FiscalPeriodDto>;
}

/**
 * POST /api/v1/tenants/:tenantId/fiscal-periods/:periodId/close
 */
export async function closeFiscalPeriodApi(
  tenantId: string = getActiveTenantId(),
  periodId: string,
  token?: string,
): Promise<FiscalPeriodDto> {
  const path = `/tenants/${encodeURIComponent(tenantId)}/fiscal-periods/${encodeURIComponent(periodId)}/close`;

  return apiRequest(path, {
    method: 'POST',
    headers: getAuthHeaders(token),
  }) as Promise<FiscalPeriodDto>;
}

/**
 * POST /api/v1/tenants/:tenantId/fiscal-periods/:periodId/reopen
 */
export async function reopenFiscalPeriodApi(
  tenantId: string = getActiveTenantId(),
  periodId: string,
  payload: ReopenFiscalPeriodPayload,
  token?: string,
): Promise<FiscalPeriodDto> {
  const path = `/tenants/${encodeURIComponent(tenantId)}/fiscal-periods/${encodeURIComponent(periodId)}/reopen`;

  return apiRequest(path, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  }) as Promise<FiscalPeriodDto>;
}
