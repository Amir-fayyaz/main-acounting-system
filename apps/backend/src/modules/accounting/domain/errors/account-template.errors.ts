import { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';

export class AccountTemplateAlreadyAppliedError extends DomainError {
  public constructor(templateVersion: string) {
    super(
      'ACCOUNT_TEMPLATE_ALREADY_APPLIED',
      'The standard chart template has already been applied to this company.',
      {
        category: ErrorCategory.CONFLICT,
        details: [
          {
            code: 'ACCOUNT_TEMPLATE_ALREADY_APPLIED',
            field: 'templateVersion',
            message: 'This template version was already activated for the tenant.',
            templateVersion,
          },
        ],
      },
    );
  }
}

export class AccountTemplateInvalidError extends DomainError {
  public constructor(templateVersion: string, violation: string) {
    super('ACCOUNT_TEMPLATE_INVALID', 'The standard chart template is not valid.', {
      category: ErrorCategory.STATE_VIOLATION,
      details: [
        {
          code: 'ACCOUNT_TEMPLATE_INVALID',
          field: 'templateVersion',
          message: violation,
          templateVersion,
        },
      ],
    });
  }
}
