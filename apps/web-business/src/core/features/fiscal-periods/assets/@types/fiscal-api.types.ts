/**
 * Fiscal year and period API types matching backend OpenAPI specification (/api/docs).
 */

export type ApiFiscalYearStatus = 'open' | 'closed';
export type ApiFiscalPeriodState = 'open' | 'closed';

/**
 * Single fiscal year response from GET /api/v1/tenants/:tenantId/fiscal-years/:fiscalYearId
 * or created from POST /api/v1/tenants/:tenantId/fiscal-years
 */
export interface FiscalYearDto {
  readonly id: string;
  readonly tenantId: string;
  readonly label: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: ApiFiscalYearStatus;
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Payload for POST /api/v1/tenants/:tenantId/fiscal-years
 */
export interface CreateFiscalYearPayload {
  readonly label: string;
  readonly startDate: string;
  readonly endDate: string;
}

/**
 * Single fiscal period response from:
 * - GET /api/v1/tenants/:tenantId/fiscal-years/:fiscalYearId/periods
 * - POST /api/v1/tenants/:tenantId/fiscal-periods/:periodId/select-active
 * - POST /api/v1/tenants/:tenantId/fiscal-periods/:periodId/close
 * - POST /api/v1/tenants/:tenantId/fiscal-periods/:periodId/reopen
 */
export interface FiscalPeriodDto {
  readonly id: string;
  readonly tenantId: string;
  readonly fiscalYearId: string;
  readonly jalaliYear: number;
  readonly sequence: number;
  readonly startDate: string;
  readonly endDate: string;
  readonly state: ApiFiscalPeriodState;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Payload for POST /api/v1/tenants/:tenantId/fiscal-periods/:periodId/reopen
 */
export interface ReopenFiscalPeriodPayload {
  readonly reason: string;
}

/**
 * Pagination metadata envelope from GET lists
 */
export interface PaginationMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface PaginatedDto<T> {
  readonly data: readonly T[];
  readonly meta: PaginationMeta;
}

export interface ListQueryParams {
  readonly page?: number;
  readonly limit?: number;
}

/**
 * Domain error codes returned by the backend API for fiscal years and periods
 */
export type FiscalPaginatedResponse<T> = PaginatedDto<T>;
export type FiscalYearResponseDto = FiscalYearDto;
export type FiscalPeriodResponseDto = FiscalPeriodDto;

export const FISCAL_ERROR_CODES = {
  YEAR_OVERLAP: 'FISCAL_YEAR_OVERLAP',
  YEAR_LABEL_DUPLICATE: 'FISCAL_YEAR_LABEL_DUPLICATE',
  YEAR_INVALID_RANGE: 'FISCAL_YEAR_INVALID_RANGE',
  YEAR_NOT_FOUND: 'FISCAL_YEAR_NOT_FOUND',
  PERIOD_STRUCTURE: 'FISCAL_PERIOD_STRUCTURE',
  PERIOD_STATE_INVALID: 'PERIOD_STATE_INVALID',
  PERIOD_NOT_OPEN: 'FISCAL_PERIOD_NOT_OPEN',
  PERIOD_NOT_FOUND: 'FISCAL_PERIOD_NOT_FOUND',
  REOPEN_REASON_REQUIRED: 'REOPEN_REASON_REQUIRED',
  PERMISSION_REQUIRED: 'PERMISSION_REQUIRED',
  TENANT_ACCESS_DENIED: 'TENANT_ACCESS_DENIED',
} as const;

export type FiscalErrorCode = (typeof FISCAL_ERROR_CODES)[keyof typeof FISCAL_ERROR_CODES];
