/**
 * The standard API error contract (FND-006, ADR-013 section 8).
 *
 * Every failure leaving the HTTP boundary has this shape, whatever produced it:
 * validation, a not-found lookup, a domain rule or an unexpected bug. Clients
 * therefore parse one structure, and the categories below stay stable even as
 * modules are added.
 */

/**
 * Coarse grouping of a failure, so a client can tell a business outcome from a
 * bug or a rejected request without knowing every specific `code`.
 *
 * - `validation` — the request was rejected before any use case ran.
 * - `client`     — the request was understood but could not be satisfied
 *                  (not found, conflict, authentication/authorization).
 * - `domain`     — a business rule rejected the operation.
 * - `technical`  — an unexpected server-side failure.
 */
export type ApiErrorCategory = 'validation' | 'client' | 'domain' | 'technical';

/** One reason a request was rejected, addressed to a specific input field. */
export interface ApiErrorDetail {
  /** Dotted path of the offending input (`amount.currency`, `page`). */
  readonly field: string;
  /** Stable machine-readable reason (a class-validator constraint name). */
  readonly code: string;
  /** Human-readable explanation with no echoed input value. */
  readonly message: string;
}

/** The JSON body of every error response. */
export interface ApiErrorBody {
  readonly error: {
    /** Stable, switchable error code. */
    readonly code: string;
    readonly category: ApiErrorCategory;
    /** A message safe to show a user; never contains internal detail. */
    readonly message: string;
    /** Identifier that ties this response to the server-side log entry. */
    readonly correlationId: string;
    /** Present for validation failures (and any failure with field detail). */
    readonly details?: readonly ApiErrorDetail[];
  };
}
