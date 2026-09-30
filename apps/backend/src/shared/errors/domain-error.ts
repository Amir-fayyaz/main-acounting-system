/**
 * Base class for a business/domain failure that is safe to show to a client.
 *
 * It lives in the shared kernel because it is an *error primitive*, which
 * ADR-002 section 10 explicitly allows: the domain and application layers may
 * throw a `DomainError` without importing NestJS, HTTP or anything from
 * `infrastructure/`, and the presentation layer maps it to the standard API
 * error contract (ADR-013, section 8).
 *
 * Two rules keep this primitive useful and safe:
 *
 * - `message` must be written for a client. It is serialized verbatim, so it
 *   must never contain a stack trace, a query, a credential or another internal
 *   detail (06-security-engineering).
 * - `code` identifies the failure in the owning module's language
 *   (`PERIOD_ALREADY_CLOSED`, ...). The API layer exposes it as-is so a client
 *   can react to a specific business failure instead of parsing a message.
 */
export abstract class DomainError extends Error {
  public readonly code: string;

  protected constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
  }
}
