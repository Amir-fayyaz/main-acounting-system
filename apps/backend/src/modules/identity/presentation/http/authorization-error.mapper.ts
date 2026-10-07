import { HttpStatus } from '@nestjs/common';
import { API_ERROR_CODES } from '../../../../infrastructure/api/errors/api-error.registry.js';
import { ApiErrorException } from '../../../../infrastructure/api/errors/api-error.exception.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';
import { raiseAuthenticationFailure, toApiDetails } from './authentication-error.mapper.js';

/**
 * Turns an authorization failure into the standard transport failure (IAM-006;
 * FND-006; ADR-013 section 8).
 *
 * Authorization is the one place where the *status* itself carries the security
 * meaning, so the split is explicit:
 *
 * - **`401 Unauthorized`** — the request is not authenticated (or its
 *   authentication state is no longer acceptable). Raised through the
 *   authentication mapper, so a rejected token, an expired session and a
 *   deactivated account keep their own codes.
 * - **`403 Forbidden`** — the request *is* authenticated but may not perform
 *   this operation: the capability is missing, the operation needs a tenant and
 *   none was resolved, the caller has no membership there, or that membership
 *   is not active. The domain's own stable code travels with it
 *   (`AUTHORIZATION_DENIED`, `MEMBERSHIP_REQUIRED`, …) so a client can react
 *   without parsing a message.
 *
 * No failure discloses whether a tenant, a membership or a record exists for
 * somebody else: the messages come from the authorization vocabulary, which
 * never says more than "not permitted".
 */
const FORBIDDEN_CODES: readonly string[] = [
  'AUTHORIZATION_DENIED',
  'TENANT_CONTEXT_REQUIRED',
  'MEMBERSHIP_REQUIRED',
  'MEMBERSHIP_INACTIVE',
  'AUTHORIZATION_CONTEXT_INVALID',
  'AUTHORIZATION_POLICY_MISSING',
];

/** Raises the transport failure that matches `error`; never returns. */
export function raiseAuthorizationFailure(error: DomainError): never {
  if (FORBIDDEN_CODES.includes(error.code)) {
    throw new ApiErrorException(HttpStatus.FORBIDDEN, error.code, 'client', error.message);
  }

  // Everything else keeps the authentication mapping: 401 for authentication
  // failures, and the ordinary validation/not-found/conflict/domain mapping for
  // anything that is not a security outcome at all.
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
      return raiseAuthenticationFailure(error);
  }
}
