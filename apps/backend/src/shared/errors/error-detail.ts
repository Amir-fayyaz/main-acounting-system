import { describeValue, validateNonBlank } from '../primitives/assert.js';
import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';

/**
 * One structured, self-contained reason attached to a {@link DomainError}
 * (SHR-002).
 *
 * The shape is deliberately transport-free: nothing here knows about HTTP
 * status, headers or a response body, so the same detail works in a `Result`
 * returned by a use case, in a job payload and — only if the presentation layer
 * chooses — in an API response.
 *
 * Extra keys are allowed but must be JSON primitives (`string`, `number`,
 * `boolean`, `null`). That is what makes a detail serializable by construction,
 * and what keeps an `Error`, a query or a credential from being handed to a
 * client by accident: an object-valued key is rejected outright rather than
 * stringified.
 *
 * Sensitive material still must not be written here. `message` is client-facing
 * by contract (06-security-engineering): no stack trace, no SQL, no token, no
 * raw internal identifier.
 */
export type ErrorDetailValue = string | number | boolean | null;

export interface ErrorDetail {
  /** Stable machine-readable reason, e.g. `MIN` or `PERIOD_CLOSED`. */
  readonly code: string;
  /** Client-safe explanation. */
  readonly message: string;
  /** Dotted path the detail addresses (`lines[2].quantity`), when field-scoped. */
  readonly field?: string;
  /** Optional primitive facts supporting the message (`expected`, `actual`, ...). */
  readonly [key: string]: ErrorDetailValue | undefined;
}

/** Most details one error may carry — a sanity bound, not a business rule. */
export const MAX_ERROR_DETAILS = 50;

/**
 * Validates, copies and freezes details so a `DomainError` can only ever hold a
 * snapshot that is safe to serialize.
 *
 * The copy matters: without it a caller could keep a mutable reference and
 * rewrite an error after it was raised, which would break the audit trail the
 * architecture requires (domain map, section 3 — changes must stay traceable).
 */
export function normalizeDetails(
  details: readonly ErrorDetail[] | undefined,
): readonly ErrorDetail[] {
  if (details === undefined) {
    return [];
  }
  if (!Array.isArray(details)) {
    throw new InvalidPrimitiveError(
      'ErrorDetail',
      `details must be an array but received ${describeValue(details)}`,
    );
  }
  if (details.length > MAX_ERROR_DETAILS) {
    throw new InvalidPrimitiveError(
      'ErrorDetail',
      `details must hold at most ${MAX_ERROR_DETAILS} entries but received ${details.length}`,
    );
  }

  return Object.freeze(details.map((detail, index) => normalizeDetail(detail, index)));
}

function normalizeDetail(detail: ErrorDetail, index: number): ErrorDetail {
  if (detail === null || typeof detail !== 'object' || Array.isArray(detail)) {
    throw new InvalidPrimitiveError(
      'ErrorDetail',
      `details[${index}] must be an object but received ${describeValue(detail)}`,
    );
  }

  // Presence and type of the two required keys, checked before anything else.
  validateNonBlank(detail.code, 'ErrorDetail', `details[${index}].code`);
  validateNonBlank(detail.message, 'ErrorDetail', `details[${index}].message`);

  const entries: Array<[string, ErrorDetailValue]> = [];
  for (const [key, value] of Object.entries(detail)) {
    if (value === undefined) {
      continue;
    }
    if (key === 'code' || key === 'message' || key === 'field') {
      entries.push([
        key,
        validateNonBlank(value as string, 'ErrorDetail', `details[${index}].${key}`),
      ]);
      continue;
    }
    entries.push([key, assertPrimitive(value, index, key)]);
  }

  const copy: Record<string, ErrorDetailValue> = {};
  for (const [key, value] of entries) {
    // Defined rather than assigned so a hostile key such as `__proto__` becomes
    // an ordinary own property instead of reaching the prototype chain.
    Object.defineProperty(copy, key, {
      value,
      enumerable: true,
      writable: false,
      configurable: false,
    });
  }
  return Object.freeze(copy) as unknown as ErrorDetail;
}

function assertPrimitive(value: unknown, index: number, key: string): ErrorDetailValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new InvalidPrimitiveError(
        'ErrorDetail',
        `details[${index}].${key} must be a finite number but received ${describeValue(value)}`,
      );
    }
    return value;
  }
  throw new InvalidPrimitiveError(
    'ErrorDetail',
    `details[${index}].${key} must be a JSON primitive (string, number, boolean or null) but received ${describeValue(value)}`,
  );
}
