import { ValidationError } from '../../../../shared/errors/category-errors.js';
import type { DomainError } from '../../../../shared/errors/domain-error.js';
import { Result } from '../../../../shared/errors/result.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';
import {
  PermissionKey,
  PERMISSION_KEY_MAX_LENGTH,
} from '../../domain/value-objects/permission-key.js';
import { RoleName, ROLE_NAME_MAX_LENGTH } from '../../domain/value-objects/role-name.js';

/**
 * Turns raw client input into validated Role values (IAM-004).
 *
 * The HTTP boundary already rejects an obviously bad name or key as a *client*
 * mistake (FND-006), but a use case is called from jobs, tests and other modules
 * too, so it owns the same decision in business terms: bad input is an expected
 * outcome and comes back as `Result.fail(ValidationError)`, not as a thrown
 * primitive error a caller would have to treat as a bug.
 *
 * A non-string reaching here is a programming error, not a business one, so it
 * keeps propagating as `InvalidPrimitiveError` rather than being softened.
 *
 * (Whether a well-formed permission key is a *known* capability is a separate,
 * catalog-level decision the use cases make — see `UnknownPermissionError`.)
 */
export function parseRoleName(raw: unknown): Result<RoleName, DomainError> {
  try {
    return Result.ok(RoleName.from(raw as string));
  } catch (error) {
    if (error instanceof InvalidPrimitiveError) {
      return Result.fail(
        new ValidationError('The role name is invalid.', [
          {
            code: 'ROLE_NAME_INVALID',
            field: 'name',
            message: `name must be a non-blank string of at most ${ROLE_NAME_MAX_LENGTH} characters`,
          },
        ]),
      );
    }
    throw error;
  }
}

/** Turns raw client input into a validated {@link PermissionKey}. */
export function parsePermissionKey(raw: unknown): Result<PermissionKey, DomainError> {
  try {
    return Result.ok(PermissionKey.from(raw as string));
  } catch (error) {
    if (error instanceof InvalidPrimitiveError) {
      return Result.fail(
        new ValidationError('The permission key is invalid.', [
          {
            code: 'PERMISSION_KEY_INVALID',
            field: 'permissionKey',
            message: `permissionKey must be a dotted lower-case capability of at most ${PERMISSION_KEY_MAX_LENGTH} characters`,
          },
        ]),
      );
    }
    throw error;
  }
}
