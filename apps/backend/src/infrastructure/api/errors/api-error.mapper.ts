import { HttpException } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error.js';
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

/** The error contract reduced to the fields the filter serializes. */
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
 * Reduces any thrown value to the standard contract.
 *
 * The rules encode the security requirement that API errors never disclose
 * internals (06-security-engineering, ADR-010):
 *
 * - A `DomainError` carries a client-safe message by contract, so it is kept.
 * - A `TenantContextMissingError` maps to `TENANT_REQUIRED` (TNT-002) so
 *   clients see a stable boundary code rather than a generic 500.
 * - A `TenantIsolationViolationError` maps to the generic `FORBIDDEN` body: a
 *   cross-tenant attempt is refused, and the response never names the tenant
 *   that was requested or the one the caller actually holds (IAM-007).
 * - An `ApiErrorException` states its own code/message.
 * - Another `HttpException` keeps its message only for a 4xx (an author written
 *   client error); a 5xx always falls back to a generic message.
 * - Anything else — an unexpected bug — becomes a generic 500. The cause is
 *   logged server-side by the filter, never serialized.
 */
export function mapException(exception: unknown): MappedApiError {
  if (exception instanceof DomainError) {
    return {
      status: API_ERROR_DEFINITIONS[API_ERROR_CODES.DOMAIN_ERROR].status,
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
