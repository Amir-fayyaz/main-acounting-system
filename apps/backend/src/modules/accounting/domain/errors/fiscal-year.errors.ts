import { DomainError } from '../../../../shared/errors/domain-error.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';

/**
 * Fiscal-year business failures (FIS-002).
 *
 * Each carries a stable `code` in this module's language so a client can switch
 * on the failure without parsing a message, and each fixes the shared
 * {@link ErrorCategory} that says *what kind* of failure it is. None knows
 * about HTTP: how a failure becomes a response, a log line or an alert is the
 * presentation layer's decision (FND-006; ADR-013).
 *
 * `FISCAL_YEAR_OVERLAP` is the code the ticket names and the one a client
 * switches on; when an HTTP surface lands, its category (`CONFLICT`) is what
 * maps to 409 while the code is preserved verbatim (the mapping itself is out
 * of scope for this ticket — see the design, section 5.1).
 */

/**
 * A fiscal year of the same tenant already covers at least one day of the
 * requested range.
 *
 * This is the invariant the ticket exists for: a company's fiscal years partition
 * time, so two of them sharing a day would give the ledger two valid frames for
 * the same dates. A *closed* year blocks just as an open one does — closure is a
 * lifecycle state, not an exemption from the range rule.
 */
export class FiscalYearOverlapError extends DomainError {
  public constructor() {
    super(
      'FISCAL_YEAR_OVERLAP',
      'A fiscal year of this company already covers part of the requested date range.',
      { category: ErrorCategory.CONFLICT },
    );
  }
}

/**
 * The requested range's start date is not strictly before its end date.
 *
 * A fiscal year must be able to hold at least one period, so the shortest legal
 * year covers two calendar days (start through end, both inclusive);
 * `start == end` would be a year with no day at all and is refused alongside
 * the already-reversed range.
 */
export class FiscalYearInvalidRangeError extends DomainError {
  public constructor(startDate: string, endDate: string) {
    super(
      'FISCAL_YEAR_INVALID_RANGE',
      'A fiscal year must start strictly before it ends.',
      {
        category: ErrorCategory.VALIDATION,
        details: [
          {
            code: 'FISCAL_YEAR_INVALID_RANGE',
            field: 'startDate',
            message: 'startDate must be strictly before endDate',
            startDate,
            endDate,
          },
        ],
      },
    );
  }
}

/**
 * The label is already taken by another fiscal year of the same tenant.
 *
 * Labels are unique per tenant so a year can be named and referenced without
 * ambiguity (`FY2024` means one year in one company); two different tenants
 * may each have a year of the same name. The database enforces the same rule
 * through `UNIQUE (tenant_id, label)`, and this error is what the application
 * reports whether the duplicate was caught in memory or refused by the store.
 */
export class FiscalYearLabelDuplicateError extends DomainError {
  public constructor() {
    super(
      'FISCAL_YEAR_LABEL_DUPLICATE',
      'Another fiscal year of this company already uses that label.',
      { category: ErrorCategory.CONFLICT },
    );
  }
}

/**
 * A closed fiscal year is taken out of use; the transition is refused rather
 * than silently ignored, and there is deliberately no reopen: reopening a year
 * is a controlled act of the period-closing policy, not part of the year's
 * creation ticket (FIS-002 scope).
 */
export class FiscalYearAlreadyClosedError extends DomainError {
  public constructor() {
    super('FISCAL_YEAR_ALREADY_CLOSED', 'The fiscal year is already closed.', {
      category: ErrorCategory.STATE_VIOLATION,
    });
  }
}
