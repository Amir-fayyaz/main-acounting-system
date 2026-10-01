import { InvalidPrimitiveError } from './invalid-primitive-error.js';

/**
 * The validation rules every shared primitive applies to its raw input.
 *
 * They live in one place so `EntityId`, `Currency`, `Money`, `Quantity`,
 * `BusinessDate` and `DateTime` reject the same shapes of bad input in the same
 * way, with the same message shape: `<Primitive>: <field> must be ... but
 * received ...`. The rules describe *form* only — never business meaning.
 *
 * Each helper validates and returns the value, so a caller can chain
 * normalization (trimming, case folding) without validating twice.
 */

/** Longest raw value echoed back in an error message; anything longer is truncated. */
const MAX_ECHOED_VALUE = 64;

/** Renders an arbitrary runtime value for an error message without dumping a whole payload. */
export function describeValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'undefined';
  }
  if (typeof value === 'string') {
    return value.length > MAX_ECHOED_VALUE
      ? `${JSON.stringify(`${value.slice(0, MAX_ECHOED_VALUE)}...`)}`
      : JSON.stringify(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (typeof value === 'symbol') {
    return 'a symbol';
  }
  if (typeof value === 'function') {
    return 'a function';
  }
  return 'an object';
}

/** Rejects a non-string or blank value and returns it trimmed. */
export function validateNonBlank(value: string, primitive: string, field: string): string {
  if (typeof value !== 'string') {
    throw new InvalidPrimitiveError(
      primitive,
      `${field} must be a string but received ${describeValue(value)}`,
    );
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    throw new InvalidPrimitiveError(primitive, `${field} must not be blank`);
  }
  return trimmed;
}

/** Rejects a value that is not an integer inside `[min, max]` and returns it. */
export function validateIntegerInRange(
  value: number,
  min: number,
  max: number,
  primitive: string,
  field: string,
): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new InvalidPrimitiveError(
      primitive,
      `${field} must be an integer but received ${describeValue(value)}`,
    );
  }
  if (value < min || value > max) {
    throw new InvalidPrimitiveError(
      primitive,
      `${field} must be between ${min} and ${max} but received ${value}`,
    );
  }
  return value;
}

/** Rejects a string that does not match `pattern`, described in plain words. */
export function validateMatches(
  value: string,
  pattern: RegExp,
  primitive: string,
  field: string,
  expectation: string,
): string {
  if (!pattern.test(value)) {
    throw new InvalidPrimitiveError(
      primitive,
      `${field} must be ${expectation} but received ${describeValue(value)}`,
    );
  }
  return value;
}
