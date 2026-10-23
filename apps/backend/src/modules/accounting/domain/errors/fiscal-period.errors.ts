import { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';

export class PeriodStateInvalidError extends DomainError {
  public constructor(message = 'The period is in an invalid state for this operation.') {
    super('PERIOD_STATE_INVALID', message, {
      category: ErrorCategory.STATE_VIOLATION,
    });
  }
}

export class ReopenReasonRequiredError extends DomainError {
  public constructor() {
    super('REOPEN_REASON_REQUIRED', 'A non-empty reason is required to reopen a closed period.', {
      category: ErrorCategory.VALIDATION,
    });
  }
}

export class ClosedPeriodCannotBeActiveError extends DomainError {
  public constructor() {
    super('CLOSED_PERIOD_CANNOT_BE_ACTIVE', 'A closed period cannot be selected as active.', {
      category: ErrorCategory.STATE_VIOLATION,
    });
  }
}

export class PeriodNotFoundError extends DomainError {
  public constructor() {
    super('PERIOD_NOT_FOUND', 'The requested fiscal period was not found.', {
      category: ErrorCategory.NOT_FOUND,
    });
  }
}

export class FiscalYearNotFoundError extends DomainError {
  public constructor() {
    super('FISCAL_YEAR_NOT_FOUND', 'The requested fiscal year was not found.', {
      category: ErrorCategory.NOT_FOUND,
    });
  }
}
