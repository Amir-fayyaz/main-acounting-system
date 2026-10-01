/**
 * Raised when a shared-kernel primitive is asked to represent a state it does
 * not allow (a malformed decimal, an unknown currency, an impossible date...).
 *
 * Deliberately **not** a `DomainError`: `DomainError` is the contract for a
 * business failure that is safe to show to a client, and it is mapped to the
 * standard API error response. A rejected primitive is a programming error —
 * input that should have been validated at the boundary or a constant that is
 * wrong — so it surfaces as a normal error and, if it ever escapes through a
 * controller, becomes an `INTERNAL_ERROR` with no detail leaked.
 *
 * The message always names the primitive and the field so a failing test or log
 * line says exactly which value is invalid.
 */
export class InvalidPrimitiveError extends Error {
  /** Which primitive rejected the value, e.g. `Money` or `BusinessDate`. */
  public readonly primitive: string;

  /** The human-readable reason, without the `${primitive}: ` prefix. */
  public readonly detail: string;

  public constructor(primitive: string, detail: string) {
    super(`${primitive}: ${detail}`);
    this.name = new.target.name;
    this.primitive = primitive;
    this.detail = detail;
  }
}
