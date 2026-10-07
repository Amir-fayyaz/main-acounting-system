import { describeValue } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/**
 * The password policy a raw secret must satisfy before it is hashed (IAM-005;
 * TECH-006; 06-security-engineering).
 *
 * The policy is deliberately about *form only* — length and non-blankness — and
 * says nothing about composition rules, which NIST SP 800-63B advises against
 * (they push users toward predictable substitutions without adding entropy). A
 * long, non-blank secret that the user chooses is what this primitive accepts.
 */
export const PLAIN_PASSWORD_MIN_LENGTH = 12;

/**
 * The largest secret accepted.
 *
 * A bound exists so a hostile request cannot force an unbounded key-derivation
 * cost out of the server; 128 characters is far above any human-chosen secret
 * while staying cheap to hash.
 */
export const PLAIN_PASSWORD_MAX_LENGTH = 128;

/**
 * A password as the user typed it, held only long enough to be hashed or
 * verified (IAM-005).
 *
 * This type exists to make one rule structural rather than a habit **the raw
 * secret never leaves the authentication flow**:
 *
 * - it has no getter that returns the text — the single reader is
 *   `reveal()`, called by the password-hashing port and nowhere else;
 * - `toString()` and `toJSON()` return a masked placeholder, so an accidental
 *   interpolation into a log line, an error message or a response body writes
 *   `PlainPassword(***)` instead of the secret;
 * - the domain never stores it: it is converted to a {@link PasswordHash}
 *   before any state changes, and no snapshot, event, view or DTO carries it.
 *
 * Whitespace is *not* trimmed: a leading or trailing space is a legitimate part
 * of a secret, and silently changing it would make a password that was accepted
 * impossible to verify later. Length is counted in Unicode code points, so a
 * secret containing an emoji counts as one character.
 */
export class PlainPassword {
  /** The shortest secret {@link PlainPassword.from} accepts. */
  public static readonly MIN_LENGTH = PLAIN_PASSWORD_MIN_LENGTH;

  /** The longest secret {@link PlainPassword.from} accepts. */
  public static readonly MAX_LENGTH = PLAIN_PASSWORD_MAX_LENGTH;

  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Validates a raw secret against the policy.
   *
   * @throws InvalidPrimitiveError — the message names the rule and the length,
   * never the submitted value (a rejected password must not end up in a log).
   */
  public static from(raw: string): PlainPassword {
    if (typeof raw !== 'string') {
      throw new InvalidPrimitiveError(
        'PlainPassword',
        `password must be a string but received ${describeValue(raw)}`,
      );
    }

    const length = [...raw].length;

    if (length < PLAIN_PASSWORD_MIN_LENGTH) {
      throw new InvalidPrimitiveError(
        'PlainPassword',
        `password must be at least ${PLAIN_PASSWORD_MIN_LENGTH} characters`,
      );
    }

    if (length > PLAIN_PASSWORD_MAX_LENGTH) {
      throw new InvalidPrimitiveError(
        'PlainPassword',
        `password must be at most ${PLAIN_PASSWORD_MAX_LENGTH} characters`,
      );
    }

    if (raw.trim() === '') {
      throw new InvalidPrimitiveError('PlainPassword', 'password must not be blank');
    }

    return new PlainPassword(raw);
  }

  /** Whether `raw` satisfies the policy, for a boundary that only needs to reject it. */
  public static isValid(raw: unknown): boolean {
    if (typeof raw !== 'string') {
      return false;
    }

    const length = [...raw].length;
    return (
      raw.trim() !== '' &&
      length >= PLAIN_PASSWORD_MIN_LENGTH &&
      length <= PLAIN_PASSWORD_MAX_LENGTH
    );
  }

  /** The secret itself in code points, so a policy check and the stored form agree. */
  public get length(): number {
    return [...this._value].length;
  }

  /**
   * The raw secret.
   *
   * The one place a secret is handed out, and the only reason this object
   * exists: the password-hashing port needs the text to derive a key from it.
   * Everything else — snapshots, events, views, logs, errors — never calls it.
   */
  public reveal(): string {
    return this._value;
  }

  /** Never prints the secret. */
  public toString(): string {
    return 'PlainPassword(***)';
  }

  /** Serializing a secret is never allowed, so JSON gets the same mask. */
  public toJSON(): string {
    return 'PlainPassword(***)';
  }
}
