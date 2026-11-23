import { validateNonBlank } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/**
 * The tenant-unique business code of a supplier (PUR-001).
 *
 * A code is a human-entered label such as `SUP-001`. It is trimmed and bounded,
 * and it compares case-insensitively: `sup-001` and `SUP-001` name the same
 * supplier code inside one tenant, so the duplicate policy cannot be bypassed by
 * changing case. The display form keeps the user's spelling.
 */
export class SupplierCode {
  /** Largest code this primitive accepts. */
  public static readonly MAX_LENGTH = 50;

  /** The trimmed code as entered by the user. */
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  /**
   * Wraps a raw supplier code.
   *
   * @throws InvalidPrimitiveError - blank, non-string or longer than
   * {@link SupplierCode.MAX_LENGTH}.
   */
  public static from(raw: string): SupplierCode {
    const trimmed = validateNonBlank(raw, 'SupplierCode', 'value');
    if (trimmed.length > SupplierCode.MAX_LENGTH) {
      throw new InvalidPrimitiveError(
        'SupplierCode',
        `value must be at most ${SupplierCode.MAX_LENGTH} characters but received ${trimmed.length}`,
      );
    }
    return new SupplierCode(trimmed);
  }

  /** True when `raw` would be accepted by {@link SupplierCode.from}. */
  public static isValid(raw: unknown): boolean {
    if (typeof raw !== 'string') return false;
    const trimmed = raw.trim();
    return trimmed !== '' && trimmed.length <= SupplierCode.MAX_LENGTH;
  }

  /** Value equality: codes that differ only in case name the same code. */
  public equals(other: unknown): boolean {
    return other instanceof SupplierCode && other.value.toLowerCase() === this.value.toLowerCase();
  }

  public toString(): string {
    return this.value;
  }

  /** Serializes as a bare string (FND-006). */
  public toJSON(): string {
    return this.value;
  }
}
