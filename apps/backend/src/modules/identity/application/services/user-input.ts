import { ValidationError } from '../../../../shared/errors/category-errors.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';
import { UserEmail, USER_EMAIL_MAX_LENGTH } from '../../domain/value-objects/user-email.js';
import { UserName, USER_NAME_MAX_LENGTH } from '../../domain/value-objects/user-name.js';

/**
 * Turns raw client input into validated Identity value objects (IAM-002).
 *
 * The HTTP boundary already rejects a blank name or malformed email as a
 * *client* mistake (FND-006), but a use case is called from jobs, tests and
 * other modules too, so it owns the same decision in business terms: bad input
 * is an expected outcome and comes back as `Result.fail(ValidationError)`, not
 * as a thrown primitive error that a caller would have to treat as a bug.
 *
 * A non-string reaching here is a programming error, not a business one, so it
 * keeps propagating as `InvalidPrimitiveError` rather than being softened.
 */
export function parseDisplayName(raw: unknown): Result<UserName, DomainError> {
  try {
    return Result.ok(UserName.from(raw as string));
  } catch (error) {
    if (error instanceof InvalidPrimitiveError) {
      return Result.fail(
        new ValidationError('The user display name is invalid.', [
          {
            code: 'USER_NAME_INVALID',
            field: 'displayName',
            message: `displayName must be a non-blank string of at most ${USER_NAME_MAX_LENGTH} characters`,
          },
        ]),
      );
    }
    throw error;
  }
}

/** Turns raw client input into a validated {@link UserEmail}. */
export function parseUserEmail(raw: unknown): Result<UserEmail, DomainError> {
  try {
    return Result.ok(UserEmail.from(raw as string));
  } catch (error) {
    if (error instanceof InvalidPrimitiveError) {
      return Result.fail(
        new ValidationError('The user email is invalid.', [
          {
            code: 'USER_EMAIL_INVALID',
            field: 'email',
            message: `email must be a valid address of at most ${USER_EMAIL_MAX_LENGTH} characters`,
          },
        ]),
      );
    }
    throw error;
  }
}

/** Turns a raw revision into the validated persistence token, or a business failure. */
export function parseExpectedRevision(raw: unknown): Result<number, DomainError> {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1 || raw > 2_147_483_647) {
    return Result.fail(
      new ValidationError('The expected revision is invalid.', [
        {
          code: 'EXPECTED_REVISION_INVALID',
          field: 'expectedRevision',
          message: 'expectedRevision must be a positive integer',
        },
      ]),
    );
  }
  return Result.ok(raw);
}
