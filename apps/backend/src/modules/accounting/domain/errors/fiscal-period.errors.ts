import { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';
import type { ErrorDetailValue } from '../../../../shared/errors/error-detail.js';

export class FiscalPeriodYearNotFoundError extends DomainError {
  public constructor(fiscalYearId: string) {
    super('FISCAL_YEAR_NOT_FOUND', 'No fiscal year with that identity exists for this company.', {
      category: ErrorCategory.NOT_FOUND,
      details: [
        {
          code: 'FISCAL_YEAR_NOT_FOUND',
          field: 'fiscalYearId',
          message: 'fiscalYearId does not name a fiscal year of this company',
          fiscalYearId,
        },
      ],
    });
  }
}

export class FiscalPeriodStructureError extends DomainError {
  public constructor(message: string, details: FiscalPeriodStructureErrorDetail[]) {
    super('FISCAL_PERIOD_STRUCTURE', message, {
      category: ErrorCategory.BUSINESS_RULE,
      details,
    });
  }
}

export interface FiscalPeriodStructureErrorDetail {
  readonly code: 'FISCAL_PERIOD_STRUCTURE';
  readonly message: string;
  readonly jalaliYear?: number;
  [key: string]: ErrorDetailValue | undefined;
}

export class FiscalPeriodDuplicateError extends DomainError {
  public constructor() {
    super(
      'FISCAL_PERIOD_DUPLICATE',
      'A period of the same fiscal year and month already exists for this company.',
      { category: ErrorCategory.CONFLICT },
    );
  }
}

export class FiscalPeriodNotFoundError extends DomainError {
  public constructor(periodId: string) {
    super('FISCAL_PERIOD_NOT_FOUND', 'No fiscal period with that identity exists.', {
      category: ErrorCategory.NOT_FOUND,
      details: [
        {
          code: 'FISCAL_PERIOD_NOT_FOUND',
          field: 'periodId',
          message: 'periodId does not name a fiscal period of this company',
          periodId,
        },
      ],
    });
  }
}

export class FiscalPeriodNotOpenError extends DomainError {
  public constructor() {
    super('FISCAL_PERIOD_NOT_OPEN', 'Only an open period can be the active one.', {
      category: ErrorCategory.STATE_VIOLATION,
    });
  }
}

/**
 * A posting was requested on a date that falls outside every configured fiscal period (FIS-006).
 */
export class PeriodNotDefinedError extends DomainError {
  public constructor(message = 'No fiscal period is defined for that date.') {
    super('PERIOD_NOT_DEFINED', message, {
      category: ErrorCategory.NOT_FOUND,
    });
  }
}

/**
 * A posting was requested on a date whose fiscal period is already closed (FIS-006).
 */
export class PeriodClosedError extends DomainError {
  public constructor(
    message = 'The fiscal period for that date is closed and cannot be posted into.',
  ) {
    super('PERIOD_CLOSED', message, {
      category: ErrorCategory.CONFLICT,
    });
  }
}
