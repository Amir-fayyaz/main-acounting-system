import { ValidationError } from '../../../../shared/errors/category-errors.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';
import { fiscalYearIdFrom, type FiscalYearId } from '../../domain/value-objects/fiscal-year-id.js';
import {
  fiscalPeriodIdFrom,
  type FiscalPeriodId,
} from '../../domain/value-objects/fiscal-period-id.js';

/**
 * Turns raw client input into the validated identity a period command carries
 * (FIS-004).
 *
 * A use case is called from jobs, tests and other modules too, so it owns the
 * same decision the HTTP boundary would make, in business terms: a malformed
 * identity is an expected failure and comes back as a failed `Result`, not as
 * a thrown primitive error a caller would have to treat as a bug (SHR-002).
 */
export function parseFiscalYearId(raw: unknown): Result<FiscalYearId, DomainError> {
  return parseEntityId(raw, fiscalYearIdFrom, 'fiscalYearId', 'FISCAL_YEAR_ID_INVALID');
}

/** Like {@link parseFiscalYearId}, for the identity of a period. */
export function parseFiscalPeriodId(raw: unknown): Result<FiscalPeriodId, DomainError> {
  return parseEntityId(raw, fiscalPeriodIdFrom, 'periodId', 'FISCAL_PERIOD_ID_INVALID');
}

function parseEntityId<T>(
  raw: unknown,
  wrap: (value: string) => T,
  field: string,
  detailCode: string,
): Result<T, DomainError> {
  try {
    return Result.ok(wrap(raw as string));
  } catch (error) {
    if (error instanceof InvalidPrimitiveError) {
      return Result.fail(
        new ValidationError(`The ${field} is invalid.`, [
          {
            code: detailCode,
            field,
            message: `${field} must be a well-formed id`,
          },
        ]),
      );
    }
    throw error;
  }
}
