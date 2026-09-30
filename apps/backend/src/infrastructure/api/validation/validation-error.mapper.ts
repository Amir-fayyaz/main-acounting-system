import type { ValidationError } from 'class-validator';
import type { ApiErrorDetail } from '../errors/api-error.types.js';

/**
 * Converts `class-validator` failures into the field details of the standard
 * error contract.
 *
 * The messages are built here, not taken from the validator, for two reasons:
 * one stable wording per constraint instead of library defaults, and a guarantee
 * that a submitted value is never echoed back (a rejected value can be
 * confidential; 06-security-engineering).
 */
const CONSTRAINT_MESSAGES: Readonly<Record<string, string>> = {
  isString: 'must be a string',
  isInt: 'must be an integer',
  isNumber: 'must be a number',
  isBoolean: 'must be a boolean',
  isArray: 'must be an array',
  isIn: 'must be one of the allowed values',
  isUuid: 'must be a valid identifier',
  isNotEmpty: 'must not be empty',
  isDefined: 'is required',
  min: 'is below the minimum allowed value',
  max: 'is above the maximum allowed value',
  minLength: 'is shorter than the minimum length',
  maxLength: 'is longer than the maximum length',
  matches: 'has an invalid format',
  whitelistValidation: 'is not an accepted property',
  nestedValidation: 'is not a valid object',
};

export function mapValidationErrors(
  errors: readonly ValidationError[],
  parentPath = '',
): ApiErrorDetail[] {
  const details: ApiErrorDetail[] = [];

  for (const error of errors) {
    const field = parentPath.length > 0 ? `${parentPath}.${error.property}` : error.property;

    for (const [constraint, defaultMessage] of Object.entries(error.constraints ?? {})) {
      const wording = CONSTRAINT_MESSAGES[constraint];

      details.push({
        field,
        code: constraint,
        // A known constraint gets a stable wording prefixed with the field; an
        // unknown one keeps the validator's default, which already names the
        // field and would read as a duplicate if it were prefixed again.
        message: wording !== undefined ? `${field} ${wording}` : defaultMessage,
      });
    }

    if (error.children !== undefined && error.children.length > 0) {
      details.push(...mapValidationErrors(error.children, field));
    }
  }

  return details;
}
