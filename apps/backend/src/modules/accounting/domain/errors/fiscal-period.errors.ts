import { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';
import type { ErrorDetailValue } from '../../../../shared/errors/error-detail.js';

/**
 * Fiscal-period business failures (FIS-004).
 *
 * Each carries a stable `code` in this module's language so a client can switch
 * on the failure without parsing a message, and each fixes the shared
 * {@link ErrorCategory} that says *what kind* of failure it is. None knows
 * about HTTP: how a failure becomes a response, a log line or an alert is the
 * presentation layer's decision (FND-006; ADR-013).
 */

/**
 * No fiscal year with the requested identity exists for the active tenant.
 *
 * A year is the only frame periods may be generated inside; without it there
 * is nothing to generate, and "which company lacks the year" is decided by the
 * tenant scope — the scope filter means another company's year reads as
 * absent, never as a cross-tenant leak.
 */
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

/**
 * A fiscal year's range does not span exactly one Jalali year, so the twelve
 * monthly periods cannot cover it with no gap and no overlap.
 *
 * This is the contiguity guarantee the ticket exists for, and it fails before
 * anything is written: a year whose boundaries are not the Nawruz and the last
 * Esfand of one Jalali year cannot hold twelve contiguous monthly periods, so
 * generating them would produce a broken fiscal frame.
 */
export class FiscalPeriodStructureError extends DomainError {
  public constructor(message: string, details: FiscalPeriodStructureErrorDetail[]) {
    super('FISCAL_PERIOD_STRUCTURE', message, {
      category: ErrorCategory.BUSINESS_RULE,
      details,
    });
  }
}

/** A structured reason the period structure was refused. */
export interface FiscalPeriodStructureErrorDetail {
  readonly code: 'FISCAL_PERIOD_STRUCTURE';
  readonly message: string;
  readonly jalaliYear?: number;
  // The kernel's `ErrorDetail` carries JSON primitives; stay compatible.
  [key: string]: ErrorDetailValue | undefined;
}

/**
 * The requested fiscal year already has periods; generation is idempotent and
 * never rewrites them.
 *
 * Generation's refusal is stored-level only: the use case itself no-ops when a
 * plan is replayed. This error surfaces when the persistence layer — which
 * defends the same rule with `UNIQUE (tenant_id, fiscal_year_id, sequence)` —
 * sees a duplicate insert that a concurrent generation raced past the
 * in-memory check.
 */
export class FiscalPeriodDuplicateError extends DomainError {
  public constructor() {
    super(
      'FISCAL_PERIOD_DUPLICATE',
      'A period of the same fiscal year and month already exists for this company.',
      { category: ErrorCategory.CONFLICT },
    );
  }
}

/**
 * No fiscal period with the requested identity exists for the active tenant.
 */
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

/**
 * Selecting a closed period as the tenant's active one is refused (FIS-004).
 *
 * The active period is the frame the company books into; a closed period
 * stopped accepting postings and can never carry the active flag again. The
 * transition belongs to the period-closing policy, not to selection.
 */
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
