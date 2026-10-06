import { validateNonBlank } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/** The canonical max length for a role name (room for growth). */
export const ROLE_NAME_MAX_LENGTH = 100;

/**
 * A Role's name inside a tenant (IAM-004).
 *
 * It is a normalized trimmed non-blank string bounded to a maximum length, so
 * two names that differ only in surrounding whitespace compare equal and no role
 * can carry a blank or absurdly long name. It is a *label*, not an identity: the
 * stable identity is the {@link RoleId}, and the capabilities a role grants are
 * its permission keys — never inferred from the name.
 */
export class RoleName {
  /** The largest length {@link RoleName.from} accepts. */
  public static readonly MAX_LENGTH = ROLE_NAME_MAX_LENGTH;

  /** The trimmed, canonical text. Guaranteed non-blank and within the bound. */
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  /**
   * Normalizes and validates a raw role name.
   *
   * @throws InvalidPrimitiveError — blank (after trimming) or longer than
   * {@link ROLE_NAME_MAX_LENGTH}.
   */
  public static from(raw: string): RoleName {
    const trimmed = validateNonBlank(raw, 'RoleName', 'name');
    if (trimmed.length > ROLE_NAME_MAX_LENGTH) {
      throw new InvalidPrimitiveError(
        'RoleName',
        `name must be at most ${ROLE_NAME_MAX_LENGTH} characters but received ${trimmed.length}`,
      );
    }
    return new RoleName(trimmed);
  }

  /** True when `raw` normalizes to a value this primitive would accept. */
  public static isValid(raw: unknown): boolean {
    if (typeof raw !== 'string') return false;
    const trimmed = raw.trim();
    return trimmed !== '' && trimmed.length <= ROLE_NAME_MAX_LENGTH;
  }

  /** Structural equality: two names with the same canonical text are equal. */
  public equals(other: RoleName): boolean {
    return other instanceof RoleName && this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }

  /** Serializes as the plain role-name string (FND-006 serialization). */
  public toJSON(): string {
    return this.value;
  }
}
