import { ValidationError } from '../../../../shared/errors/category-errors.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';
import { TenantName } from '../../domain/value-objects/tenant-name.js';

/**
 * Turns raw client input into a validated {@link TenantName} (IAM-001).
 *
 * The HTTP boundary already rejects a blank or over-long name as a *client*
 * mistake (FND-006), but a use case is called from jobs, tests and other
 * modules too, so it owns the same decision in business terms: bad input is an
 * expected outcome and comes back as `Result.fail(ValidationError)`, not as a
 * thrown primitive error that a caller would have to treat as a bug.
 *
 * A non-string reaching here is a programming error, not a business one, so it
 * keeps propagating as `InvalidPrimitiveError` rather than being softened.
 */
export function parseTenantName(raw: unknown): Result<TenantName, DomainError> {
  try {
    return Result.ok(TenantName.from(raw as string));
  } catch (error) {
    if (error instanceof InvalidPrimitiveError) {
      return Result.fail(
        new ValidationError('The tenant name is invalid.', [
          {
            code: 'TENANT_NAME_INVALID',
            field: 'name',
            message: `name must be a non-blank string of at most ${TenantName.MAX_LENGTH} characters`,
          },
        ]),
      );
    }
    throw error;
  }
}
