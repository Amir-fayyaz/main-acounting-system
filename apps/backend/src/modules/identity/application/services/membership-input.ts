import { ValidationError } from '../../../../shared/errors/category-errors.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { isUserId, userIdFrom, type UserId } from '../../domain/value-objects/user-id.js';

/**
 * Turns raw client input into validated Identity values for memberships
 * (IAM-003).
 *
 * The HTTP boundary already rejects an obviously malformed id as a *client*
 * mistake (FND-006), but a use case is called from jobs, tests and other modules
 * too, so it owns the same decision in business terms: bad input is an expected
 * outcome and comes back as `Result.fail(ValidationError)`, not as a thrown
 * primitive error a caller would have to treat as a bug.
 *
 * (The expected-revision input is shared with the user feature: `parseExpectedRevision`
 * in `./user-input.js` already owns exactly that decision, so memberships reuse
 * it rather than restate it.)
 */
export function parseMembershipUserId(raw: unknown): Result<UserId, DomainError> {
  if (!isUserId(raw as string)) {
    return Result.fail(
      new ValidationError('The user identifier is invalid.', [
        {
          code: 'MEMBERSHIP_USER_ID_INVALID',
          field: 'userId',
          message: 'userId must be a UUID user identifier',
        },
      ]),
    );
  }
  return Result.ok(userIdFrom(raw as string));
}
