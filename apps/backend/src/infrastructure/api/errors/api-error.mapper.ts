import { HttpException, HttpStatus } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../shared/errors/error-category.js';
import {
  TenantContextMissingError,
  TenantIsolationViolationError,
} from '../../../shared/tenant/tenant.errors.js';
import { ApiErrorException } from './api-error.exception.js';
import {
  API_ERROR_CODES,
  API_ERROR_DEFINITIONS,
  errorCodeForStatus,
} from './api-error.registry.js';
import type { ApiErrorCategory, ApiErrorDetail } from './api-error.types.js';

export interface MappedApiError {
  readonly status: number;
  readonly code: string;
  readonly category: ApiErrorCategory;
  readonly message: string;
  readonly details?: readonly ApiErrorDetail[];
}

const INTERNAL_ERROR = API_ERROR_DEFINITIONS[API_ERROR_CODES.INTERNAL_ERROR];
const TENANT_REQUIRED = API_ERROR_DEFINITIONS[API_ERROR_CODES.TENANT_REQUIRED];
const FORBIDDEN = API_ERROR_DEFINITIONS[API_ERROR_CODES.FORBIDDEN];

/**
 * The HTTP status each failure *category* carries (doc 13, "Status mapping").
 *
 * A `DomainError` keeps its own module code verbatim — the code is the stable,
 * switchable identity of the failure (`FISCAL_YEAR_OVERLAP`, `PERIOD_STATE_INVALID`,
 * `REOPEN_REASON_REQUIRED`, …) — while the status comes from the category, so a
 * conflict answers 409, a missing resource 404, rejected input 400 and a business
 * rule or lifecycle violation 422. Deriving the status from the category (rather
 * than special-casing individual codes) is what keeps a new module-owned code at
 * the status its category promises without touching this mapper again.
 */
const DOMAIN_STATUS_BY_CATEGORY: Readonly<Record<ErrorCategory, HttpStatus>> = {
  [ErrorCategory.VALIDATION]: HttpStatus.BAD_REQUEST,
  [ErrorCategory.NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCategory.CONFLICT]: HttpStatus.CONFLICT,
  [ErrorCategory.BUSINESS_RULE]: HttpStatus.UNPROCESSABLE_ENTITY,
  [ErrorCategory.STATE_VIOLATION]: HttpStatus.UNPROCESSABLE_ENTITY,
};

export function mapException(exception: unknown): MappedApiError {
  if (exception instanceof DomainError) {
    return {
      status: DOMAIN_STATUS_BY_CATEGORY[exception.category],
      code: exception.code,
      category: 'domain',
      message: exception.message,
    };
  }

  if (exception instanceof TenantContextMissingError) {
    return {
      status: TENANT_REQUIRED.status,
      code: API_ERROR_CODES.TENANT_REQUIRED,
      category: TENANT_REQUIRED.category,
      message: TENANT_REQUIRED.defaultMessage,
    };
  }

  if (exception instanceof TenantIsolationViolationError) {
    return {
      status: FORBIDDEN.status,
      code: API_ERROR_CODES.FORBIDDEN,
      category: FORBIDDEN.category,
      message: FORBIDDEN.defaultMessage,
    };
  }

  if (exception instanceof ApiErrorException) {
    return {
      status: exception.getStatus(),
      code: exception.code,
      category: exception.category,
      message: exception.clientMessage,
      details: exception.details,
    };
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const code = errorCodeForStatus(status);
    const definition = API_ERROR_DEFINITIONS[code];

    return {
      status,
      code,
      category: definition.category,
      message: clientMessageFor(exception, status, definition.defaultMessage),
    };
  }

  return {
    status: INTERNAL_ERROR.status,
    code: API_ERROR_CODES.INTERNAL_ERROR,
    category: INTERNAL_ERROR.category,
    message: INTERNAL_ERROR.defaultMessage,
  };
}

function clientMessageFor(exception: HttpException, status: number, fallback: string): string {
  if (status >= 500) {
    return fallback;
  }

  const response: unknown = exception.getResponse();

  if (typeof response === 'string' && response.trim().length > 0) {
    return response;
  }

  if (typeof response === 'object' && response !== null) {
    const message: unknown = (response as { message?: unknown }).message;

    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
}
