import { DomainError } from './domain-error.js';
import { ErrorCategory } from './error-category.js';
import type { ErrorDetail } from './error-detail.js';

/**
 * Ready-made failures for the five categories the architecture requires
 * (SHR-002), so a module does not have to re-declare what `NOT_FOUND` means.
 *
 * Each fixes its own `category` and carries a generic, stable `code`. They state
 * *kind*, not *meaning*: `new ConflictError('…')` says two operations collided,
 * not which of them did. A module that needs its own stable code —
 * `PERIOD_ALREADY_CLOSED`, `DUPLICATE_INVOICE_NUMBER` — extends `DomainError`
 * directly and picks its category; these classes exist so the generic cases need
 * no ceremony, not to replace module-owned codes.
 *
 * None of them knows about HTTP, so a status code is never implied here.
 */

/** Input the use case rejected before any business rule ran. */
export class ValidationError extends DomainError {
  public constructor(message: string, details?: readonly ErrorDetail[]) {
    super('VALIDATION_FAILED', message, {
      category: ErrorCategory.VALIDATION,
      details,
    });
  }

  /**
   * Composes one validation failure from many field problems, which is the
   * usual shape of a rejected form or document: the caller sees every reason at
   * once instead of one per round trip.
   */
  public static fromDetails(
    details: readonly ErrorDetail[],
    message = 'The submitted values are invalid.',
  ): ValidationError {
    return new ValidationError(message, details);
  }
}

/** A business rule declined the operation; retrying it changes nothing. */
export class BusinessRuleError extends DomainError {
  public constructor(message: string, details?: readonly ErrorDetail[]) {
    super('BUSINESS_RULE_VIOLATED', message, {
      category: ErrorCategory.BUSINESS_RULE,
      details,
    });
  }
}

/** The operation collided with existing state — a duplicate or a stale version. */
export class ConflictError extends DomainError {
  public constructor(message: string, details?: readonly ErrorDetail[]) {
    super('CONFLICT', message, { category: ErrorCategory.CONFLICT, details });
  }
}

/** The referenced thing does not exist for this caller. */
export class NotFoundError extends DomainError {
  public constructor(message: string, details?: readonly ErrorDetail[]) {
    super('NOT_FOUND', message, { category: ErrorCategory.NOT_FOUND, details });
  }
}

/** The entity's lifecycle forbids this transition right now. */
export class StateViolationError extends DomainError {
  public constructor(message: string, details?: readonly ErrorDetail[]) {
    super('STATE_VIOLATION', message, {
      category: ErrorCategory.STATE_VIOLATION,
      details,
    });
  }
}
