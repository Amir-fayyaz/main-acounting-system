import { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';

/**
 * Account domain failures (ACC-001.1).
 *
 * Each carries a stable `code` in this module's language so a client can switch
 * on the failure without parsing a message, and each fixes the shared
 * {@link ErrorCategory} that says *what kind* of failure it is. None knows about
 * HTTP: how a failure becomes a response, a log line or an alert is the
 * presentation layer's decision (FND-006; ADR-013).
 */

/**
 * A child account tries to add to a parent that doesn't exist or is inactive.
 */
export class AccountInvalidParentError extends DomainError {
  public constructor() {
    super(
      'ACCOUNT_INVALID_PARENT',
      'The parent account does not exist or is not available for this operation.',
      { category: ErrorCategory.STATE_VIOLATION },
    );
  }
}

/**
 * A cycle is detected in the account hierarchy (e.g., adding A as child of B
 * when B is already a descendant of A).
 */
export class AccountCycleError extends DomainError {
  public constructor() {
    super(
      'ACCOUNT_CYCLE',
      'Adding this account would create a cycle in the hierarchy.',
      { category: ErrorCategory.CONFLICT },
    );
  }
}

/**
 * The child's level does not equal parent.level + 1.
 */
export class AccountLevelMismatchError extends DomainError {
  public constructor(childLevel: number, parentLevel: number) {
    super(
      'ACCOUNT_LEVEL_MISMATCH',
      'A child\'s level must be exactly one more than its parent\'s level.',
      {
        category: ErrorCategory.VALIDATION,
        details: [
          {
            code: 'ACCOUNT_LEVEL_MISMATCH',
            field: 'level',
            message: 'Child level must equal parent level + 1',
            childLevel,
            parentLevel,
          },
        ],
      },
    );
  }
}

/**
 * The child's account type differs from its parent's (e.g., child is asset when parent is liability).
 */
export class AccountTypeMismatchError extends DomainError {
  public constructor(childType: string, parentType: string) {
    super(
      'ACCOUNT_TYPE_MISMATCH',
      'A child account must have the same type as its parent.',
      {
        category: ErrorCategory.VALIDATION,
        details: [
          {
            code: 'ACCOUNT_TYPE_MISMATCH',
            field: 'type',
            message: 'Child type must equal parent type',
            childType,
            parentType,
          },
        ],
      },
    );
  }
}

/**
 * The child's normal balance differs from its parent's (e.g., child is debit when parent is credit).
 */
export class AccountNormalBalanceMismatchError extends DomainError {
  public constructor(childNormalBalance: string, parentNormalBalance: string) {
    super(
      'ACCOUNT_NORMAL_BALANCE_MISMATCH',
      'A child account must have the same normal balance as its parent.',
      {
        category: ErrorCategory.VALIDATION,
        details: [
          {
            code: 'ACCOUNT_NORMAL_BALANCE_MISMATCH',
            field: 'normalBalance',
            message: 'Child normal balance must equal parent normal balance',
            childNormalBalance,
            parentNormalBalance,
          },
        ],
      },
    );
  }
}

/**
 * Attempt to add a child to a postable account (postable accounts cannot have children).
 */
export class AccountPostableWithChildrenError extends DomainError {
  public constructor() {
    super(
      'ACCOUNT_POSTABLE_WITH_CHILDREN',
      'A postable account cannot have children. Change it to non-postable first.',
      { category: ErrorCategory.BUSINESS_RULE },
    );
  }
}

/**
 * Attempt to mark an account as postable when it already has children
 * (postable accounts must be leafs).
 */
export class AccountPostableNotLeafError extends DomainError {
  public constructor() {
    super(
      'ACCOUNT_POSTABLE_NOT_LEAF',
      'Only a leaf account can be postable. Remove all children first.',
      { category: ErrorCategory.BUSINESS_RULE },
    );
  }
}

/**
 * Attempt to change a system account's structural properties.
 */
export class AccountSystemProtectedError extends DomainError {
  public constructor() {
    super(
      'ACCOUNT_SYSTEM_PROTECTED',
      'System accounts cannot be structurally modified.',
      { category: ErrorCategory.STATE_VIOLATION },
    );
  }
}

/**
 * Attempt to modify an active account's structural properties.
 */
export class AccountActiveProtectedError extends DomainError {
  public constructor() {
    super(
      'ACCOUNT_ACTIVE_PROTECTED',
      'Active accounts cannot be structurally modified.',
      { category: ErrorCategory.STATE_VIOLATION },
    );
  }
}