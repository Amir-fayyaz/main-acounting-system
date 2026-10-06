import { validateNonBlank } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/** The canonical max length for a free-text display name (room for growth). */
export const USER_NAME_MAX_LENGTH = 200;

/**
 * A person's display name inside the Identity module (IAM-002).
 *
 * It is a normalized trimmed non-blank string bounded to a maximum length, so
 * two names that differ only in surrounding whitespace compare equal and no
 * record can ever carry a blank or absurdly long name.
 *
 * Display names are not unique and carry no identity meaning beyond "how this
 * person is labelled in the UI". The stable identity is the
 * {@link UserId}.
 */
export class UserName {
  /** The largest length {@link UserName.from} accepts. */
  public static readonly MAX_LENGTH = USER_NAME_MAX_LENGTH;

  /** The trimmed, canonical text. Guaranteed non-blank and within the bound. */
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  /**
   * Normalizes and validates a raw display name.
   *
   * Rejects blank input (after trimming) and anything longer than
   * {@link USER_NAME_MAX_LENGTH}.
   */
  public static from(raw: string): UserName {
    const trimmed = validateNonBlank(raw, 'UserName', 'name');
    if (trimmed.length > USER_NAME_MAX_LENGTH) {
      throw new InvalidPrimitiveError(
        'UserName',
        `name must be at most ${USER_NAME_MAX_LENGTH} characters but received ${trimmed.length}`,
      );
    }
    return new UserName(trimmed);
  }

  /** True when `raw` normalizes to a value this primitive would accept. */
  public static isValid(raw: unknown): boolean {
    if (typeof raw !== 'string') return false;
    const trimmed = raw.trim();
    return trimmed !== '' && trimmed.length <= USER_NAME_MAX_LENGTH;
  }

  /** Structural equality: two names with the same canonical text are equal. */
  public equals(other: UserName): boolean {
    return other instanceof UserName && this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }

  /** Serializes as the plain display name string (FND-006 serialization). */
  public toJSON(): string {
    return this.value;
  }
}
