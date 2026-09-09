import { InvalidValueError } from '../errors/invalid-value.error';
import { ValueObject } from '../value-object';

/**
 * ITU-T E.164 format after normalisation: a leading `+`, a country code
 * that does not start with `0`, and between 7 and 14 additional digits
 * (so the full subscriber number is 8–15 digits — the E.164 maximum).
 */
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

/**
 * Strip characters that humans commonly insert into phone numbers when
 * writing them down — spaces, dashes, parentheses, dots — plus the
 * leading `00` international-access prefix. The remaining string must
 * then match E.164; anything else is rejected.
 */
function normalize(candidate: string): string {
  let stripped = candidate.replace(/[\s\-().]/g, '');
  if (stripped.startsWith('00')) {
    stripped = '+' + stripped.slice(2);
  }
  return stripped;
}

/**
 * E.164 phone number (BR-CONTACT-003). Stored normalised so two
 * equivalent numbers written differently compare equal and so duplicate
 * detection in the customer / supplier aggregates can rely on a single
 * canonical form.
 */
export class PhoneNumber extends ValueObject {
  private constructor(public readonly value: string) {
    super();
  }

  static of(candidate: string): PhoneNumber {
    if (typeof candidate !== 'string') {
      throw new InvalidValueError('PhoneNumber must be a string');
    }
    const normalized = normalize(candidate.trim());
    if (normalized.length === 0) {
      throw new InvalidValueError('PhoneNumber must not be empty');
    }
    if (!E164_PATTERN.test(normalized)) {
      throw new InvalidValueError(`Invalid phone number: ${candidate}`);
    }
    return new PhoneNumber(normalized);
  }

  /**
   * Best-effort ISO 3166-1 alpha-2 country code guessed from the E.164
   * prefix length. E.164 country codes are 1–3 digits and the total
   * subscriber length is 8–15 digits; we treat 8–11 as a 1–2 digit
   * country code and 12–15 as a 3-digit country code. Real country-code
   * mapping belongs in an adapter; this is only an approximation.
   */
  get countryCode(): string {
    return this.value.length <= 11 ? this.value.slice(1, 3) : this.value.slice(1, 4);
  }

  toString(): string {
    return this.value;
  }
}
