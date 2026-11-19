import { validateNonBlank } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

export const SUPPLIER_NAME_MAX_LENGTH = 200;

/**
 * Display name of a supplier.
 */
export class SupplierName {
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static from(raw: string): SupplierName {
    const trimmed = validateNonBlank(raw, 'SupplierName', 'value');
    if (trimmed.length > SUPPLIER_NAME_MAX_LENGTH) {
      throw new InvalidPrimitiveError(
        'SupplierName',
        `value must be at most ${SUPPLIER_NAME_MAX_LENGTH} characters but received ${trimmed.length}`,
      );
    }
    return new SupplierName(trimmed);
  }

  public equals(other: unknown): boolean {
    return other instanceof SupplierName && other.value === this.value;
  }

  public toString(): string {
    return this.value;
  }
}
