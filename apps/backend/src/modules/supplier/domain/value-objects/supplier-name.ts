import { validateNonBlank } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/**
 * The display name of a supplier (PUR-001).
 *
 * The name is kept exactly as the user wrote it (after trimming). Comparing
 * names for duplicates is a separate concern: the duplicate policy normalizes
 * through an injected function, so this value object never hard-codes a
 * normalization strategy and stays usable while S2 is still being built.
 */
export class SupplierName {
  /** Largest name this primitive accepts. */
  public static readonly MAX_LENGTH = 200;

  /** The trimmed display text. */
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  /**
   * Wraps a raw supplier name.
   *
   * @throws InvalidPrimitiveError - blank, non-string or longer than
   * {@link SupplierName.MAX_LENGTH}.
   */
  public static from(raw: string): SupplierName {
    const trimmed = validateNonBlank(raw, 'SupplierName', 'value');
    if (trimmed.length > SupplierName.MAX_LENGTH) {
      throw new InvalidPrimitiveError(
        'SupplierName',
        `value must be at most ${SupplierName.MAX_LENGTH} characters but received ${trimmed.length}`,
      );
    }
    return new SupplierName(trimmed);
  }

  /** True when `raw` would be accepted by {@link SupplierName.from}. */
  public static isValid(raw: unknown): boolean {
    if (typeof raw !== 'string') return false;
    const trimmed = raw.trim();
    return trimmed !== '' && trimmed.length <= SupplierName.MAX_LENGTH;
  }

  /** Value equality: the same display text. */
  public equals(other: unknown): boolean {
    return other instanceof SupplierName && other.value === this.value;
  }

  public toString(): string {
    return this.value;
  }

  /** Serializes as a bare string (FND-006). */
  public toJSON(): string {
    return this.value;
  }
}
