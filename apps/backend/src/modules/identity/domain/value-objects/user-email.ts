import { validateNonBlank } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/**
 * The largest email this primitive stores.
 *
 * Matches the storage column (`VARCHAR(254)`, the RFC 5321 practical maximum),
 * so a value this primitive accepts can never be refused by the database for
 * its length.
 */
export const USER_EMAIL_MAX_LENGTH = 254;

/** Case-insensitive email comparison and normalization helper. */
function lowerCaseEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** RFC 5322-ish local part + domain shape used as a baseline, not a guarantee. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The approved primary contact identifier for a User (IAM-002).
 *
 * It is always stored and compared in lower case so that `A@Example.com` and
 * `a@example.com` denote the same contact. The value is a non-blank string that
 * matches a baseline `local@domain.tld` shape and fits the storage column.
 *
 * Email addresses are not unique at the value-object level — uniqueness is an
 * Identity-module invariant enforced by the repository / use case, not by this
 * primitive. This type only guarantees the email is well-formed enough to be
 * stored.
 */
export class UserEmail {
  /** The largest length {@link UserEmail.from} accepts. */
  public static readonly MAX_LENGTH = USER_EMAIL_MAX_LENGTH;

  /** The canonical lower-cased, trimmed email text. */
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  /**
   * Normalizes and validates a raw email address.
   *
   * Rejects blank input, normalizes to lower case, requires the baseline
   * `something@something.something` shape and bounds the length to what storage
   * accepts. This is intentionally a weak baseline so the field is not a full
   * email-verification contract — verification is a later concern outside this
   * issue.
   */
  public static from(raw: string): UserEmail {
    const trimmed = validateNonBlank(raw, 'UserEmail', 'email');
    if (trimmed.length > USER_EMAIL_MAX_LENGTH) {
      throw new InvalidPrimitiveError(
        'UserEmail',
        `email must be at most ${USER_EMAIL_MAX_LENGTH} characters but received ${trimmed.length}`,
      );
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      throw new InvalidPrimitiveError(
        'UserEmail',
        `email must look like "you@example.com" but received ${trimmed}`,
      );
    }
    return new UserEmail(lowerCaseEmail(trimmed));
  }

  /** True when `raw` normalizes to a value this primitive would accept. */
  public static isValid(raw: unknown): boolean {
    if (typeof raw !== 'string') return false;
    const trimmed = raw.trim();
    return trimmed !== '' && trimmed.length <= USER_EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(trimmed);
  }

  /** Structural equality: two emails with the same lower-cased text are equal. */
  public equals(other: UserEmail): boolean {
    return other instanceof UserEmail && this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }

  /** Serializes as the lower-cased email string (FND-006 serialization). */
  public toJSON(): string {
    return this.value;
  }
}
