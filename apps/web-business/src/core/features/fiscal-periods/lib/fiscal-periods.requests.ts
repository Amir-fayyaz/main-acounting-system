import { apiRequest } from '@repo/web/api';

import {
  parseActiveTenantIds,
  parseFiscalPeriod,
  parseFiscalPeriodsPage,
  parseFiscalYearsPage,
  type FiscalPeriodDto,
  type FiscalYearDto,
} from './fiscal-periods.schema';

const PAGE_LIMIT = 100;

function authHeaders(token: string): Record<string, string> {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export function fetchFiscalYears(token: string, tenantId: string): Promise<FiscalYearDto[]> {
  return apiRequest(`/tenants/${tenantId}/fiscal-years?page=1&limit=${PAGE_LIMIT}`, {
    method: 'GET',
    headers: authHeaders(token),
    cache: 'no-store',
    parse: parseFiscalYearsPage,
  });
}

export function fetchFiscalPeriods(
  token: string,
  tenantId: string,
  fiscalYearId: string,
): Promise<FiscalPeriodDto[]> {
  return apiRequest(
    `/tenants/${tenantId}/fiscal-years/${fiscalYearId}/periods?page=1&limit=${PAGE_LIMIT}`,
    {
      method: 'GET',
      headers: authHeaders(token),
      cache: 'no-store',
      parse: parseFiscalPeriodsPage,
    },
  );
}

export function fetchActiveTenantIds(token: string, userId: string): Promise<string[]> {
  return apiRequest(`/users/${userId}/memberships?page=1&limit=${PAGE_LIMIT}`, {
    method: 'GET',
    headers: authHeaders(token),
    cache: 'no-store',
    parse: parseActiveTenantIds,
  });
}

export function requestClosePeriod(
  token: string,
  tenantId: string,
  periodId: string,
): Promise<FiscalPeriodDto> {
  return apiRequest(`/tenants/${tenantId}/fiscal-periods/${periodId}/close`, {
    method: 'POST',
    headers: authHeaders(token),
    cache: 'no-store',
    parse: parseFiscalPeriod,
  });
}

export function requestReopenPeriod(
  token: string,
  tenantId: string,
  periodId: string,
  reason: string,
): Promise<FiscalPeriodDto> {
  return apiRequest(`/tenants/${tenantId}/fiscal-periods/${periodId}/reopen`, {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
    cache: 'no-store',
    parse: parseFiscalPeriod,
  });
}
