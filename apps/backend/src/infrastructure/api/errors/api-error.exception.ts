import { HttpException } from '@nestjs/common';
import { API_ERROR_CODES, API_ERROR_DEFINITIONS, type ApiErrorCode } from './api-error.registry.js';
import type { ApiErrorCategory, ApiErrorDetail } from './api-error.types.js';

export interface ApiErrorOptions {
  readonly message?: string;
  readonly details?: readonly ApiErrorDetail[];
}

/**
 * An HTTP failure that already conforms to the standard API error contract.
 *
 * Throwing this type means "the message is client-safe and the code is
 * intentional". Anything else — a Nest built-in exception, an unexpected
 * `Error` — is normalised by `ApiExceptionFilter` instead.
 */
export class ApiErrorException extends HttpException {
  public readonly code: string;
  public readonly category: ApiErrorCategory;
  public readonly clientMessage: string;
  public readonly details?: readonly ApiErrorDetail[];

  constructor(
    status: number,
    code: string,
    category: ApiErrorCategory,
    message: string,
    details?: readonly ApiErrorDetail[],
  ) {
    super(message, status);
    this.code = code;
    this.category = category;
    this.clientMessage = message;
    this.details = details;
  }

  /** Builds the failure for a known infrastructure code. */
  static of(code: ApiErrorCode, options: ApiErrorOptions = {}): ApiErrorException {
    const definition = API_ERROR_DEFINITIONS[code];

    return new ApiErrorException(
      definition.status,
      code,
      definition.category,
      options.message ?? definition.defaultMessage,
      options.details,
    );
  }

  /** 400 with field-level detail, produced by the API validation pipe. */
  static validation(details: readonly ApiErrorDetail[], message?: string): ApiErrorException {
    return ApiErrorException.of(API_ERROR_CODES.VALIDATION_FAILED, { message, details });
  }

  static notFound(message?: string): ApiErrorException {
    return ApiErrorException.of(API_ERROR_CODES.NOT_FOUND, { message });
  }
}
