import { HttpStatus } from '@nestjs/common';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';
import type { ErrorDetail } from '../../../../shared/errors/error-detail.js';
import { API_ERROR_CODES } from '../../../../infrastructure/api/errors/api-error.registry.js';
import { ApiErrorException } from '../../../../infrastructure/api/errors/api-error.exception.js';
import type { ApiErrorDetail } from '../../../../infrastructure/api/errors/api-error.types.js';

/**
 * Turns an authentication failure into the standard transport failure (IAM-005;
 * FND-006; ADR-013 section 8).
 *
 * The mapping is deliberately explicit rather than "whatever the category
 * implies", because authentication is the one area where the *status* carries a
 * security meaning:
 *
 * - every authentication failure is `401 Unauthorized` — an expired session, an
 *   invalidated session, an unknown token, a non-authenticatable account and a
 *   rejected credential all say "you are not authenticated", and none of them
 *   says which component was wrong;
 * - the module's own stable `code` travels with it (`INVALID_CREDENTIALS`,
 *   `SESSION_EXPIRED`, …) and `category` is `client`, so a client can react to a
 *   specific failure — refresh, re-authenticate, contact an administrator —
 *   without parsing a message;
 * - a rejected *request* (an unknown property, a malformed email, a secret that
 *   breaks the policy) keeps the ordinary validation/not-found/conflict mapping,
 *   because those are not authentication failures and must not be reported as
 *   one;
 * - anything else is rethrown: a business-rule failure from another area and an
 *   unexpected exception keep their own handling instead of being disguised as
 *   `401`.
 *
 * No failure carries a credential: the messages and details come from the
 * domain errors, which never contain one.
 */
const UNAUTHORIZED_CODES: readonly string[] = [
  'AUTHENTICATION_REQUIRED',
  'AUTHENTICATION_STATE_REJECTED',
  'INVALID_CREDENTIALS',
  'ACCOUNT_NOT_AUTHENTICATABLE',
  'SESSION_EXPIRED',
  'SESSION_REVOKED',
];

/** Raises the transport failure that matches `error`; never returns. */
export function raiseAuthenticationFailure(error: DomainError): never {
  if (UNAUTHORIZED_CODES.includes(error.code)) {
    throw new ApiErrorException(HttpStatus.UNAUTHORIZED, error.code, 'client', error.message);
  }

  switch (error.category) {
    case ErrorCategory.VALIDATION:
      throw ApiErrorException.validation(toApiDetails(error.details), error.message);
    case ErrorCategory.NOT_FOUND:
      throw ApiErrorException.notFound(error.message);
    case ErrorCategory.CONFLICT:
      throw ApiErrorException.of(API_ERROR_CODES.CONFLICT, {
        message: error.message,
        details: toApiDetails(error.details),
      });
    default:
      // A lifecycle or business-rule failure keeps its own domain error, which
      // the shared filter maps to 422 with the module's code.
      throw error;
  }
}

/** Narrows kernel error details to the API error-detail shape. */
export function toApiDetails(details: readonly ErrorDetail[]): readonly ApiErrorDetail[] {
  return details.map((detail) => ({
    field: detail.field ?? '',
    code: detail.code,
    message: detail.message,
  }));
}
