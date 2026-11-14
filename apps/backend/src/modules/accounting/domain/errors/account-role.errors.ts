import { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';

export class AccountRoleInvalidTargetError extends DomainError {
  public constructor(role: string, reason: string) {
    super(
      'ACCOUNT_ROLE_INVALID_TARGET',
      `The account cannot be mapped to role "${role}": ${reason}`,
      {
        category: ErrorCategory.BUSINESS_RULE,
        details: [
          {
            code: 'ACCOUNT_ROLE_INVALID_TARGET',
            field: 'accountId',
            message: reason,
            role,
          },
        ],
      },
    );
  }
}

export class AccountRoleUnmappedError extends DomainError {
  public constructor(role: string) {
    super('ACCOUNT_ROLE_UNMAPPED', `No account is mapped to role "${role}".`, {
      category: ErrorCategory.NOT_FOUND,
      details: [
        {
          code: 'ACCOUNT_ROLE_UNMAPPED',
          field: 'role',
          message: 'No account mapping exists for this role.',
          role,
        },
      ],
    });
  }
}

export class AccountRoleProtectedError extends DomainError {
  public constructor() {
    super(
      'ACCOUNT_ROLE_ACCOUNT_PROTECTED',
      'This account is assigned to an accounting role. Remap the role before disabling or making the account non-postable.',
      { category: ErrorCategory.BUSINESS_RULE },
    );
  }
}
