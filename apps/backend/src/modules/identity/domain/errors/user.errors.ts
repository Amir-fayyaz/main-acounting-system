import { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';
import type { UserStatusValue } from '../value-objects/user-status.js';

/**
 * Identity-owned business failures (IAM-002).
 *
 * Each carries a stable `code` in this module's language so a client can switch
 * on the failure without parsing a message, and each fixes the shared
 * {@link ErrorCategory} that says *what kind* of failure it is. None knows about
 * HTTP: how a failure becomes a response, a log line or an alert is the
 * presentation layer's decision (FND-006; ADR-013).
 */

/** The requested user identity does not exist. */
export class UserNotFoundError extends DomainError {
  public constructor() {
    super('USER_NOT_FOUND', 'No user was found for the requested identity.', {
      category: ErrorCategory.NOT_FOUND,
    });
  }
}

/**
 * The user is inactive, so an operation that changes its current profile is
 * refused before any mutation.
 *
 * Deactivation is not deletion: the record and its history stay, but they stop
 * changing. Requiring the user to be active is how the domain guarantees that a
 * user taken out of use does not quietly continue to mutate (IAM-002:
 * "operations must validate the current User state before mutation").
 */
export class InactiveUserError extends DomainError {
  public constructor() {
    super('USER_INACTIVE', 'An inactive user cannot be modified. Reactivate them first.', {
      category: ErrorCategory.STATE_VIOLATION,
    });
  }
}

/**
 * A requested lifecycle move is not allowed from the user's current state — for
 * example activating a user that is already active, or deactivating one that is
 * already inactive.
 *
 * This is the invariant that makes the two-state lifecycle meaningful: a caller
 * cannot "change" a state into the one it already holds and mistake that for
 * progress, and the domain says so precisely instead of silently doing nothing.
 */
export class InvalidUserStatusTransitionError extends DomainError {
  public constructor(from: UserStatusValue, to: UserStatusValue) {
    super(
      'INVALID_USER_STATUS_TRANSITION',
      `A user cannot move to "${to}" while they are "${from}".`,
      { category: ErrorCategory.STATE_VIOLATION },
    );
  }
}

/**
 * A user with the given unique attribute already exists.
 *
 * The email is the primary contact identifier, so creating a second user for
 * the same address is a collision with existing state rather than a server
 * error: it is reported as a conflict the caller can act on.
 */
export class DuplicateUserError extends DomainError {
  public constructor(field: string, value: string) {
    super('DUPLICATE_USER', `A user with the given ${field} already exists.`, {
      category: ErrorCategory.CONFLICT,
      details: [
        { code: 'DUPLICATE_USER', field, message: `${field} "${value}" is already in use` },
      ],
    });
  }
}
