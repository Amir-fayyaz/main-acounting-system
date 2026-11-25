import { DomainError } from '../../../../shared/errors/domain-error.js';
import { MAX_ERROR_DETAILS } from '../../../../shared/errors/error-detail.js';
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
    super('ACCOUNT_CYCLE', 'Adding this account would create a cycle in the hierarchy.', {
      category: ErrorCategory.CONFLICT,
    });
  }
}

/**
 * The child's level does not equal parent.level + 1.
 */
export class AccountLevelMismatchError extends DomainError {
  public constructor(childLevel: number, parentLevel: number) {
    super(
      'ACCOUNT_LEVEL_MISMATCH',
      "A child's level must be exactly one more than its parent's level.",
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
    super('ACCOUNT_TYPE_MISMATCH', 'A child account must have the same type as its parent.', {
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
    });
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
    super('ACCOUNT_SYSTEM_PROTECTED', 'System accounts cannot be structurally modified.', {
      category: ErrorCategory.STATE_VIOLATION,
    });
  }
}

/**
 * Attempt to modify an active account's structural properties.
 */
export class AccountActiveProtectedError extends DomainError {
  public constructor() {
    super('ACCOUNT_ACTIVE_PROTECTED', 'Active accounts cannot be structurally modified.', {
      category: ErrorCategory.STATE_VIOLATION,
    });
  }
}

export class AccountNotFoundError extends DomainError {
  public constructor(accountId: string) {
    super('ACCOUNT_NOT_FOUND', 'The account could not be found in the current tenant.', {
      category: ErrorCategory.NOT_FOUND,
      details: [
        { code: 'ACCOUNT_NOT_FOUND', field: 'id', message: 'Account not found', accountId },
      ],
    });
  }
}

export class AccountCodeDuplicateError extends DomainError {
  public constructor(code: string) {
    super('ACCOUNT_CODE_DUPLICATE', 'An account with this code already exists in the tenant.', {
      category: ErrorCategory.CONFLICT,
      details: [
        {
          code: 'ACCOUNT_CODE_DUPLICATE',
          field: 'code',
          message: 'Duplicate account code',
          accountCode: code,
        },
      ],
    });
  }
}

export class AccountInUseError extends DomainError {
  public constructor() {
    super('ACCOUNT_IN_USE', 'This account is in use and cannot be structurally changed.', {
      // ACC-001.7: a used account's structure is locked for the caller's
      // request, which is a collision with current state (409), not a 422.
      category: ErrorCategory.CONFLICT,
    });
  }
}

export class AccountHasChildrenError extends DomainError {
  public constructor() {
    super(
      'ACCOUNT_HAS_CHILDREN',
      'This account cannot be deleted while it still has child accounts.',
      {
        category: ErrorCategory.BUSINESS_RULE,
      },
    );
  }
}

export class AccountHasActiveChildrenError extends DomainError {
  public constructor() {
    super(
      'ACCOUNT_HAS_ACTIVE_CHILDREN',
      'This account cannot be deactivated while it still has active child accounts.',
      // ACC-001.7: the request collides with the current chart (409).
      { category: ErrorCategory.CONFLICT },
    );
  }
}

export class AccountParentInactiveError extends DomainError {
  public constructor() {
    super(
      'ACCOUNT_PARENT_INACTIVE',
      'The parent account must be active before this action is allowed.',
      {
        category: ErrorCategory.STATE_VIOLATION,
      },
    );
  }
}

export class AccountDeletionForbiddenError extends DomainError {
  public constructor() {
    super('ACCOUNT_CANNOT_DELETE', 'This account cannot be deleted.', {
      category: ErrorCategory.BUSINESS_RULE,
    });
  }
}

/**
 * An account exists in the current tenant but is inactive, so it can no longer
 * receive postings (ACC-001.6). The account stays readable in history.
 */
export class AccountInactiveError extends DomainError {
  public constructor(accountId: string) {
    super('ACCOUNT_INACTIVE', 'This account is inactive and cannot receive postings.', {
      category: ErrorCategory.BUSINESS_RULE,
      details: [
        {
          code: 'ACCOUNT_INACTIVE',
          field: 'accountId',
          message: 'Account is inactive',
          accountId,
        },
      ],
    });
  }
}

/**
 * An account exists in the current tenant and is active, but it is a grouping
 * node (not postable), so no journal line may point at it (ACC-001.6).
 */
export class AccountNotPostableError extends DomainError {
  public constructor(accountId: string) {
    super('ACCOUNT_NOT_POSTABLE', 'This account is not postable and cannot receive postings.', {
      category: ErrorCategory.BUSINESS_RULE,
      details: [
        {
          code: 'ACCOUNT_NOT_POSTABLE',
          field: 'accountId',
          message: 'Account is not postable',
          accountId,
        },
      ],
    });
  }
}

/**
 * The batch form of the posting guard's refusal (ACC-001.6).
 *
 * One error carries every failing account so the Agent plan and other batch
 * callers can show every problem at once instead of one per round trip. The
 * error's own `code` and `category` are those of the first failure in the
 * caller's order; each detail keeps the precise reason for its account, so a
 * client can still switch on `ACCOUNT_NOT_FOUND` / `ACCOUNT_INACTIVE` /
 * `ACCOUNT_NOT_POSTABLE` per detail.
 *
 * Details are bounded by the shared `MAX_ERROR_DETAILS` safety limit; the
 * message always reports the full number of failures.
 */
export class AccountPostingRejectedError extends DomainError {
  public constructor(failures: readonly DomainError[]) {
    const first = failures[0];
    const details = failures.flatMap((failure) => failure.details).slice(0, MAX_ERROR_DETAILS);

    super(
      first?.code ?? 'ACCOUNT_NOT_POSTABLE',
      failures.length === 1
        ? (first?.message ?? 'The account cannot receive postings.')
        : `${failures.length} accounts cannot receive postings in this company.`,
      {
        category: first?.category ?? ErrorCategory.BUSINESS_RULE,
        details,
      },
    );
  }
}
