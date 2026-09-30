import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { redactProcessSecrets } from '../../config/secrets.js';
import { CORRELATION_ID_HEADER, type CorrelatedRequest } from '../correlation/correlation-id.js';
import { mapException } from './api-error.mapper.js';
import type { ApiErrorBody } from './api-error.types.js';

interface ErrorResponse {
  status(code: number): { json(body: ApiErrorBody): void };
}

const FALLBACK_CORRELATION_ID = 'unavailable';

/**
 * Turns every failure that reaches the HTTP boundary into the standard error
 * contract (FND-006, ADR-013 section 8).
 *
 * It is registered globally, so it also covers failures the framework raises
 * itself (an unknown route, a malformed body). Two invariants matter:
 *
 * - The response body is built only from the mapped contract. A stack trace or
 *   an unexpected exception message can never be serialized.
 * - A 5xx is logged server-side with its stack, redacted through the same
 *   secret redactor the rest of the app uses, so operators keep the detail that
 *   the client must not see (06-security-engineering).
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<
      Partial<CorrelatedRequest> & { method?: string; url?: string }
    >();
    const response = context.getResponse<ErrorResponse>();

    const mapped = mapException(exception);
    const correlationId = request.correlationId ?? FALLBACK_CORRELATION_ID;

    const body: ApiErrorBody = {
      error: {
        code: mapped.code,
        category: mapped.category,
        message: mapped.message,
        correlationId,
        ...(mapped.details !== undefined ? { details: mapped.details } : {}),
      },
    };

    if (mapped.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method ?? 'HTTP'} ${request.url ?? ''} failed with ${mapped.code} [${CORRELATION_ID_HEADER}: ${correlationId}]`,
        redactProcessSecrets(describe(exception)),
      );
    }

    response.status(mapped.status).json(body);
  }
}

/** Full server-side detail, used for logging only — never for the response. */
function describe(exception: unknown): string {
  if (exception instanceof Error) {
    return exception.stack ?? `${exception.name}: ${exception.message}`;
  }

  return String(exception);
}
