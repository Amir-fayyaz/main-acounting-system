import { validateNonBlank } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/**
 * The code that uniquely identifies an account within a tenant's chart of accounts.
 *
 * Account codes are hierarchical strings (e.g., "1000", "1100", "1110") that encode
 * the account's position in the tree. The domain treats them as opaque identifiers
 * with format rules; the hierarchy is expressed through the parent relationship,
 * not by parsing the code.
 */
export class AccountCode {
  /** Maximum length to match typical storage column constraints. */
  public static readonly MAX_LENGTH = 32;

  /** The trimmed, non-blank code string. */
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  /**
   * Wraps a raw account code.
   *
   * @throws InvalidPrimitiveError — a non-string, blank, or over-long value is
   * a programming error at this layer: the boundary rejects it before a use case
   * ever constructs one.
   */
  public static from(value: string): AccountCode {
    const trimmed = validateNonBlank(value, 'AccountCode', 'value');

    if (trimmed.length > AccountCode.MAX_LENGTH) {
      throw new InvalidPrimitiveError(
        'AccountCode',
        `value must be at most ${AccountCode.MAX_LENGTH} characters but received ${trimmed.length}`,
      );
    }

    return new AccountCode(trimmed);
  }

  /** Value equality: the same code text. */
  public equals(other: unknown): boolean {
    return other instanceof AccountCode && other.value === this.value;
  }

  public toString(): string {
    return this.value;
  }

  /** Serializes as a bare string, the identifier/text wire format of FND-006. */
  public toJSON(): string {
    return this.value;
  }
}