import { InvalidValueError } from '../errors/invalid-value.error';
import { ValueObject } from '../value-object';

const MAX_FIELD_LENGTH = 120;
const MIN_POSTAL_LENGTH = 3;
const MAX_POSTAL_LENGTH = 12;
const POSTAL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s-]{1,11}$/;

function normaliseField(value: string, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new InvalidValueError(`Address ${fieldName} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new InvalidValueError(`Address ${fieldName} must not be empty`);
  }
  if (trimmed.length > MAX_FIELD_LENGTH) {
    throw new InvalidValueError(
      `Address ${fieldName} exceeds the maximum length of ${MAX_FIELD_LENGTH} characters`,
    );
  }
  return trimmed;
}

function normalisePostal(value: string): string {
  const trimmed = normaliseField(value, 'postalCode');
  if (trimmed.length < MIN_POSTAL_LENGTH || trimmed.length > MAX_POSTAL_LENGTH) {
    throw new InvalidValueError(
      `Address postalCode must be between ${MIN_POSTAL_LENGTH} and ${MAX_POSTAL_LENGTH} characters`,
    );
  }
  if (!POSTAL_PATTERN.test(trimmed)) {
    throw new InvalidValueError(`Invalid postal code: ${value}`);
  }
  return trimmed.toUpperCase();
}

/**
 * Composite postal address. Each part is normalised on construction so
 * the same physical address written with different casing or whitespace
 * compares equal via the inherited structural {@link ValueObject.equals}.
 *
 * Postal-code validation is intentionally loose: real-world codes differ
 * per country (UK: `SW1A 1AA`, US: `94103`, Iran: `1234567890`). The
 * value object guards shape — non-empty, alphanumeric with spaces or
 * dashes, 3–12 characters — and lets per-country adapters layer
 * stricter rules on top.
 */
export class Address extends ValueObject {
  private constructor(
    public readonly street: string,
    public readonly city: string,
    public readonly postalCode: string,
    public readonly country: string,
  ) {
    super();
  }

  static of(args: { street: string; city: string; postalCode: string; country: string }): Address {
    return new Address(
      normaliseField(args.street, 'street'),
      normaliseField(args.city, 'city'),
      normalisePostal(args.postalCode),
      normaliseField(args.country, 'country'),
    );
  }

  /** Single-line rendering suitable for invoices and shipping labels. */
  format(): string {
    return `${this.street}, ${this.city} ${this.postalCode}, ${this.country}`;
  }
}
