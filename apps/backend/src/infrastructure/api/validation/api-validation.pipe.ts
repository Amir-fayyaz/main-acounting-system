import { ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { ApiErrorException } from '../errors/api-error.exception.js';
import { mapValidationErrors } from './validation-error.mapper.js';

/**
 * The single input-validation boundary for every HTTP endpoint (FND-006,
 * ADR-013 section 7: validation happens in presentation/application, never as a
 * substitute for a domain invariant).
 *
 * Registered globally in `bootstrap.ts`, so a module enables nothing per
 * controller and cannot opt out. Its choices:
 *
 * - `whitelist` + `forbidNonWhitelisted`: unknown properties are rejected rather
 *   than silently dropped, which keeps mass-assignment mistakes visible.
 * - `transform`: the request becomes the DTO class, so defaults and coercion
 *   (`@Type`) apply and handlers receive typed values.
 * - A custom `exceptionFactory`: a failure becomes the standard error contract
 *   with per-field detail, instead of Nest's default `message: string[]` body.
 *
 * Implicit conversion is off on purpose: a query parameter is converted only
 * where a DTO asks for it with `@Type`, so coercion stays explicit and readable.
 */
export function createApiValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    validationError: { target: false, value: false },
    exceptionFactory: (errors: ValidationError[]) =>
      ApiErrorException.validation(mapValidationErrors(errors)),
  });
}
