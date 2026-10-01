/**
 * The failure categories the architecture distinguishes *before* any transport
 * decides what to do with them (SHR-002; ADR-004 section 12 — a failure must be
 * classified so retry and handling depend on its kind, not on luck).
 *
 * The vocabulary is deliberately generic: `BUSINESS_RULE` says *what kind* of
 * thing failed, never *which* business rule. The specific meaning stays with the
 * owning module, which names it through its own stable `code`.
 *
 * These are not the API categories of FND-006 (`validation`/`client`/`domain`/
 * `technical`), and they are not HTTP statuses. Whether, and how, a category
 * reaches a response body is the presentation layer's decision; the domain only
 * ever states the category.
 */
export enum ErrorCategory {
  /** Input the use case rejected before any rule ran. */
  VALIDATION = 'VALIDATION',
  /** A business rule declined the operation. Not retryable (ADR-004, section 12). */
  BUSINESS_RULE = 'BUSINESS_RULE',
  /** The operation collided with existing state, e.g. a duplicate or stale version. */
  CONFLICT = 'CONFLICT',
  /** The referenced thing does not exist for this caller. */
  NOT_FOUND = 'NOT_FOUND',
  /** The entity's lifecycle forbids this transition right now. */
  STATE_VIOLATION = 'STATE_VIOLATION',
}

const CATEGORIES: readonly string[] = Object.values(ErrorCategory);

/** Runtime guard so an unknown string cannot be cast into a category. */
export function isErrorCategory(value: unknown): value is ErrorCategory {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}
