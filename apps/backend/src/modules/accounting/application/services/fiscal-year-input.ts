import { ValidationError } from '../../../../shared/errors/category-errors.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';
import { BusinessDate } from '../../../../shared/time/business-date.js';
import { FiscalYearInvalidRangeError } from '../../domain/errors/fiscal-year.errors.js';
import { FiscalYearLabel } from '../../domain/value-objects/fiscal-year-label.js';
import { FiscalYearRange } from '../../domain/value-objects/fiscal-year-range.js';

/**
 * Turns raw client input into the validated value objects a fiscal year is
 * built from (FIS-002).
 *
 * A use case is called from jobs, tests and other modules too, so it owns the
 * same decision the HTTP boundary would make, in business terms: bad input is
 * an expected outcome and comes back as a failed `Result`, not as a thrown
 * primitive error a caller would have to treat as a bug (SHR-002).
 *
 * The two refusals are deliberately different. A malformed *value* — a blank
 * label, an unparseable date — is a generic `ValidationError` carrying the
 * module's stable detail code, because nothing business-specific happened: the
 * caller simply sent something that is not a label or not a date. A *range*
 * whose start is not before its end is a module-owned
 * {@link FiscalYearInvalidRangeError} (`FISCAL_YEAR_INVALID_RANGE`): the dates
 * are well-formed, the company just asked for a year that cannot exist, and a
 * client switching on codes must see that distinction preserved.
 *
 * A non-string reaching here is a programming error, not a business one, so it
 * keeps propagating as `InvalidPrimitiveError` rather than being softened.
 */
export function parseFiscalYearLabel(raw: unknown): Result<FiscalYearLabel, DomainError> {
  try {
    return Result.ok(FiscalYearLabel.from(raw as string));
  } catch (error) {
    if (error instanceof InvalidPrimitiveError) {
      return Result.fail(
        new ValidationError('The fiscal year label is invalid.', [
          {
            code: 'FISCAL_YEAR_LABEL_INVALID',
            field: 'label',
            message: `label must be a non-blank string of at most ${FiscalYearLabel.MAX_LENGTH} characters`,
          },
        ]),
      );
    }
    throw error;
  }
}

/**
 * Parses the two inclusive ends of a fiscal year.
 *
 * The dates are parsed first — an unparseable end is a validation failure —
 * and only then is the order decided, so `FISCAL_YEAR_INVALID_RANGE` always
 * describes two real days.
 */
export function parseFiscalYearRange(
  rawStartDate: unknown,
  rawEndDate: unknown,
): Result<FiscalYearRange, DomainError> {
  const startDate = parseBusinessDate(rawStartDate, 'startDate');
  if (startDate.isFail()) {
    return Result.fail(startDate.errorOrThrow());
  }
  const endDate = parseBusinessDate(rawEndDate, 'endDate');
  if (endDate.isFail()) {
    return Result.fail(endDate.errorOrThrow());
  }

  try {
    return Result.ok(FiscalYearRange.of(startDate.valueOrThrow(), endDate.valueOrThrow()));
  } catch (error) {
    if (error instanceof FiscalYearInvalidRangeError) {
      return Result.fail(error);
    }
    throw error;
  }
}

function parseBusinessDate(raw: unknown, field: string): Result<BusinessDate, DomainError> {
  try {
    return Result.ok(BusinessDate.parse(raw as string));
  } catch (error) {
    if (error instanceof InvalidPrimitiveError) {
      return Result.fail(
        new ValidationError('The fiscal year date is invalid.', [
          {
            code: 'FISCAL_YEAR_DATE_INVALID',
            field,
            message: `${field} must be a calendar date in YYYY-MM-DD format`,
          },
        ]),
      );
    }
    throw error;
  }
}
