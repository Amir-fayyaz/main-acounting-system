import { randomUUID } from 'node:crypto';
import { context, trace } from '@opentelemetry/api';
import { LogContext } from '../../logging/log-context.js';

/**
 * Correlation identifier for a request (FND-006, ADR-013 section 8).
 *
 * Every error response echoes a `correlationId` that also appears in the
 * server-side log line, so a support report can be tied back to the exact
 * failure without the client ever seeing internal detail.
 *
 * With tracing on (FND-015) the id *is* the OpenTelemetry trace id when no
 * caller supplies one, so a structured log line and the spans of the same
 * request carry the same value and a trace can be found from a log — and the
 * other way around. A caller-supplied `x-correlation-id` still wins: it is an
 * explicit upstream intent that the response contract echoes back, and the
 * trace id is then recorded *alongside* it in `LogContext` (FND-016), never
 * instead of it.
 *
 * A caller-supplied `x-correlation-id` is accepted only when it is short and
 * made of a safe character set; anything else is replaced, so a client cannot
 * inject an unbounded or structured value into logs and responses.
 */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

const MAX_CORRELATION_ID_LENGTH = 128;
const SAFE_CORRELATION_ID = /^[A-Za-z0-9._:-]+$/;
/** A valid W3C trace id: 32 lowercase hex characters. */
const VALID_TRACE_ID = /^[0-9a-f]{32}$/;

/** The subset of the HTTP request the middleware needs. */
export interface CorrelatedRequest {
  readonly headers: Record<string, string | string[] | undefined>;
  correlationId?: string;
}

/** The subset of the HTTP response the middleware needs. */
export interface CorrelationResponse {
  setHeader(name: string, value: string): void;
}

/**
 * The correlation id of this request, in precedence order:
 *
 * 1. the caller's validated `x-correlation-id` header (explicit intent);
 * 2. the trace id of the active OpenTelemetry span (tracing on — FND-015),
 *    so logs and traces carry the same id;
 * 3. `undefined` (the caller decides: the HTTP middleware generates a UUID,
 *    a test asserts on the absence).
 */
export function resolveCorrelationId(header: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(header) ? header[0] : header;

  if (
    typeof candidate === 'string' &&
    candidate.length > 0 &&
    candidate.length <= MAX_CORRELATION_ID_LENGTH &&
    SAFE_CORRELATION_ID.test(candidate)
  ) {
    return candidate;
  }

  return resolveTraceId();
}

/**
 * The trace id of the active OpenTelemetry span, or `undefined` when tracing
 * is off or no span is active (FND-015). Guarded against anything that is not
 * a valid W3C trace id, so an odd value cannot reach the logs.
 */
export function resolveTraceId(): string | undefined {
  const span = trace.getSpan(context.active());
  const traceId = span?.spanContext().traceId;

  return traceId !== undefined && VALID_TRACE_ID.test(traceId) ? traceId : undefined;
}

/**
 * Assigns the correlation id to the request and echoes it on the response.
 * Registered application-wide, before any route, so a failure thrown by the
 * framework itself (a 404, a malformed body) also carries one.
 *
 * The id is also published through `LogContext` for the rest of the request
 * (FND-011): every line written while handling it — in the controller, a use
 * case, a repository, the exception filter — carries the same id without being
 * handed one. `next()` runs *inside* the scope, so the asynchronous work it
 * starts inherits it and nothing outside the request ever sees it.
 */
/**
 * The documented precedence rule (FND-016), applied consistently by this
 * middleware, `LogContext` and the job envelope:
 *
 * - A caller-supplied `x-correlation-id` **wins** and stays the correlation id
 *   everywhere (response echo, log lines, job payloads) — it is explicit
 *   upstream intent.
 * - The OpenTelemetry trace id is recorded **alongside** it (`LogContext`'s
 *   `traceId`), never instead of it, so an upstream correlation id and a trace
 *   can both be followed.
 * - Without a caller header, the trace id **is** the correlation id, so the
 *   two ids coincide and a trace is found from a log and the other way around.
 * - With neither, a fresh UUID is generated.
 */
export function correlationIdMiddleware(
  request: CorrelatedRequest,
  response: CorrelationResponse,
  next: () => void,
): void {
  const correlationId = resolveCorrelationId(request.headers[CORRELATION_ID_HEADER]) ?? randomUUID();
  // The trace id rides alongside the caller's id (FND-016); when no header was
  // supplied it equals the correlation id.
  const traceId = resolveTraceId();

  request.correlationId = correlationId;
  response.setHeader(CORRELATION_ID_HEADER, correlationId);
  LogContext.run(
    { correlationId, ...(traceId === undefined ? {} : { traceId }) },
    next,
  );
}
