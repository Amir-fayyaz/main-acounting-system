import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Inject } from '@nestjs/common';
import { toLogError, type Logger } from '../../logging/logger.js';
import { LOGGER } from '../../logging/logging.tokens.js';
import type { CorrelatedRequest } from '../correlation/correlation-id.js';
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
 * - A 5xx is logged server-side with its stack, through the structured logger
 *   (FND-011), which redacts every string it writes with the same redactor the
 *   rest of the app uses. A 4xx is not logged: it is the client's mistake, and
 *   logging it would let a caller fill the log. Operators keep the detail that
 *   the client must not see (06-security-engineering).
 *
 * The correlation id is no longer formatted into the message: the logger reads
 * it from the ambient `LogContext`, so the line carries it as a field.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(@Inject(LOGGER) private readonly logger: Logger) {}

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
      const stack = describe(exception);

      this.logger.error(
        `${request.method ?? 'HTTP'} ${request.url ?? ''} failed with ${mapped.code}`,
        {
          // The header fallback is only reachable outside a middleware-handled
          // request (a test harness); the ambient context is the normal source.
          ...(request.correlationId === undefined ? { correlationId } : {}),
          error: toLogError(exception, mapped.category),
          detail: {
            method: request.method ?? 'HTTP',
            path: request.url ?? '',
            status: mapped.status,
            code: mapped.code,
            stack,
          },
        },
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
