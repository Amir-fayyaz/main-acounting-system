import { randomUUID } from 'node:crypto';

/**
 * Correlation identifier for a request (FND-006, ADR-013 section 8).
 *
 * Every error response echoes a `correlationId` that also appears in the
 * server-side log line, so a support report can be tied back to the exact
 * failure without the client ever seeing internal detail.
 *
 * A caller-supplied `x-correlation-id` is accepted only when it is short and
 * made of a safe character set; anything else is replaced by a generated id, so
 * a client cannot inject an unbounded or structured value into logs and
 * responses.
 */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

const MAX_CORRELATION_ID_LENGTH = 128;
const SAFE_CORRELATION_ID = /^[A-Za-z0-9._:-]+$/;

/** The subset of the HTTP request the middleware needs. */
export interface CorrelatedRequest {
  readonly headers: Record<string, string | string[] | undefined>;
  correlationId?: string;
}

/** The subset of the HTTP response the middleware needs. */
export interface CorrelationResponse {
  setHeader(name: string, value: string): void;
}

export function resolveCorrelationId(header: string | string[] | undefined): string {
  const candidate = Array.isArray(header) ? header[0] : header;

  if (
    typeof candidate === 'string' &&
    candidate.length > 0 &&
    candidate.length <= MAX_CORRELATION_ID_LENGTH &&
    SAFE_CORRELATION_ID.test(candidate)
  ) {
    return candidate;
  }

  return randomUUID();
}

/**
 * Assigns the correlation id to the request and echoes it on the response.
 * Registered application-wide, before any route, so a failure thrown by the
 * framework itself (a 404, a malformed body) also carries one.
 */
export function correlationIdMiddleware(
  request: CorrelatedRequest,
  response: CorrelationResponse,
  next: () => void,
): void {
  const correlationId = resolveCorrelationId(request.headers[CORRELATION_ID_HEADER]);

  request.correlationId = correlationId;
  response.setHeader(CORRELATION_ID_HEADER, correlationId);
  next();
}
