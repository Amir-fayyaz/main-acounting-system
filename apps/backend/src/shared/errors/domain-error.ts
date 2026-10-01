import { validateMatches, validateNonBlank } from '../primitives/assert.js';
import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';
import { ErrorCategory, isErrorCategory } from './error-category.js';
import { normalizeDetails, type ErrorDetail } from './error-detail.js';

/**
 * Base class for a business/domain failure that is safe to show to a client.
 *
 * It lives in the shared kernel because it is an *error primitive*, which
 * ADR-002 section 10 explicitly allows: the domain and application layers may
 * throw a `DomainError` without importing NestJS, HTTP or anything from
 * `infrastructure/`, and the presentation layer maps it to the standard API
 * error contract (ADR-013, section 8).
 *
 * The model makes one distinction explicit (SHR-002):
 *
 * ```text
 * Expected domain/application failure   →  Result / DomainError
 * Unexpected technical failure          →  Exception / infrastructure handling
 * ```
 *
 * A `DomainError` is the first kind: an outcome the business anticipated and
 * decided about. It carries no stack, no SQL and no framework type. The second
 * kind is a plain thrown `Error` (or an infrastructure exception), which the
 * boundary converts — the domain never does.
 *
 * Four rules keep this primitive useful and safe:
 *
 * - `message` must be written for a client. It is serialized verbatim, so it
 *   must never contain a stack trace, a query, a credential or another internal
 *   detail (06-security-engineering).
 * - `code` is stable, upper-snake and identifies the failure in the owning
 *   module's language (`PERIOD_ALREADY_CLOSED`, ...). The API layer exposes it
 *   as-is so a client can react to a specific business failure instead of
 *   parsing a message.
 * - `category` says what *kind* of failure it is, from the shared vocabulary in
 *   {@link ErrorCategory}. It never says which business rule failed.
 * - `details` is an optional list of structured, serializable reasons.
 *
 * Instances are frozen: an error is a record of what happened and cannot be
 * rewritten after it was raised. A subclass therefore must not assign its own
 * field after `super(...)` — that throws — which is deliberate: anything extra
 * an error needs to say belongs in `details`, where it stays serializable. `cause` is supported for internal diagnosis but
 * is deliberately excluded from {@link DomainError.toJSON}, because a cause is
 * where an unexpected technical exception tends to hide.
 */

/** The stable, JSON-safe shape of a `DomainError`. */
export interface DomainErrorSnapshot {
  readonly code: string;
  readonly category: ErrorCategory;
  readonly message: string;
  readonly details: readonly ErrorDetail[];
}

export abstract class DomainError extends Error {
  /** Stable machine-readable code; safe to switch on in application code. */
  public readonly code: string;

  /** What kind of expected failure this is, from the shared vocabulary. */
  public readonly category: ErrorCategory;

  /** Structured, client-safe reasons; empty when the message is enough. */
  public readonly details: readonly ErrorDetail[];

  protected constructor(
    code: string,
    message: string,
    options?: {
      readonly category?: ErrorCategory;
      readonly details?: readonly ErrorDetail[];
      readonly cause?: unknown;
    },
  ) {
    const normalizedMessage = validateNonBlank(message, 'DomainError', 'message');
    const normalizedCode = validateMatches(
      validateNonBlank(code, 'DomainError', 'code'),
      /^[A-Z][A-Z0-9_]{0,63}$/,
      'DomainError',
      'code',
      'an upper-snake code such as "PERIOD_ALREADY_CLOSED"',
    );

    const category = options?.category ?? ErrorCategory.BUSINESS_RULE;
    if (!isErrorCategory(category)) {
      throw new InvalidPrimitiveError(
        'DomainError',
        `category must be one of ${Object.values(ErrorCategory).join(', ')} but received ${String(category)}`,
      );
    }

    super(normalizedMessage, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = new.target.name;
    this.code = normalizedCode;
    this.category = category;
    this.details = normalizeDetails(options?.details);
    Object.freeze(this);
  }

  /**
   * The error as plain data. Excludes `cause` on purpose: everything reachable
   * from a cause can be an implementation detail, and this is the shape that is
   * safe to hand to another layer.
   */
  public toJSON(): DomainErrorSnapshot {
    return {
      code: this.code,
      category: this.category,
      message: this.message,
      details: this.details,
    };
  }
}
