import { HttpStatus } from '@nestjs/common';
import type { ApiErrorCategory } from './api-error.types.js';

/**
 * The closed vocabulary of infrastructure error codes (FND-006, ADR-013
 * section 8).
 *
 * A module that needs a *business* code extends `DomainError` with its own code
 * (for example `PERIOD_ALREADY_CLOSED`); that code is passed through verbatim
 * with the `domain` category. This table is for failures the API layer itself
 * produces and must not grow a business meaning.
 */
export const API_ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  REQUEST_FAILED: 'REQUEST_FAILED',
  DOMAIN_ERROR: 'DOMAIN_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

export interface ApiErrorDefinition {
  readonly status: number;
  readonly category: ApiErrorCategory;
  /** The message used when a caller supplies none. Safe to show a client. */
  readonly defaultMessage: string;
}

const DEFINITIONS: Readonly<Record<ApiErrorCode, ApiErrorDefinition>> = {
  VALIDATION_FAILED: {
    status: HttpStatus.BAD_REQUEST,
    category: 'validation',
    defaultMessage: 'The request contains invalid values.',
  },
  NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    category: 'client',
    defaultMessage: 'The requested resource was not found.',
  },
  UNAUTHORIZED: {
    status: HttpStatus.UNAUTHORIZED,
    category: 'client',
    defaultMessage: 'Authentication is required.',
  },
  FORBIDDEN: {
    status: HttpStatus.FORBIDDEN,
    category: 'client',
    defaultMessage: 'The request is not allowed.',
  },
  CONFLICT: {
    status: HttpStatus.CONFLICT,
    category: 'client',
    defaultMessage: 'The request conflicts with the current state.',
  },
  REQUEST_FAILED: {
    status: HttpStatus.BAD_REQUEST,
    category: 'client',
    defaultMessage: 'The request could not be processed.',
  },
  DOMAIN_ERROR: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    category: 'domain',
    defaultMessage: 'The request violates a business rule.',
  },
  INTERNAL_ERROR: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    category: 'technical',
    defaultMessage: 'An unexpected error occurred.',
  },
};

export const API_ERROR_DEFINITIONS = DEFINITIONS;

const STATUS_TO_CODE: Readonly<Record<number, ApiErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: API_ERROR_CODES.REQUEST_FAILED,
  [HttpStatus.UNAUTHORIZED]: API_ERROR_CODES.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: API_ERROR_CODES.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: API_ERROR_CODES.NOT_FOUND,
  [HttpStatus.CONFLICT]: API_ERROR_CODES.CONFLICT,
  [HttpStatus.UNPROCESSABLE_ENTITY]: API_ERROR_CODES.DOMAIN_ERROR,
};

/**
 * Maps an HTTP status raised by the framework to a code, so a `HttpException`
 * thrown anywhere in the app still comes out in the standard envelope. An
 * unrecognised 4xx becomes `REQUEST_FAILED`; any 5xx is `INTERNAL_ERROR`.
 */
export function errorCodeForStatus(status: number): ApiErrorCode {
  const known = STATUS_TO_CODE[status];

  if (known !== undefined) {
    return known;
  }

  return status >= HttpStatus.INTERNAL_SERVER_ERROR
    ? API_ERROR_CODES.INTERNAL_ERROR
    : API_ERROR_CODES.REQUEST_FAILED;
}
