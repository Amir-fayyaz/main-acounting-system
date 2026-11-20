import { validateNonBlank } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

export const SUPPLIER_CODE_MAX_LENGTH = 50;

/**
 * Tenant-unique business identifier code for a supplier (e.g. "SUP-001").
 */
export class SupplierCode {
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static from(raw: string): SupplierCode {
    const trimmed = validateNonBlank(raw, 'SupplierCode', 'value');
    if (trimmed.length > SUPPLIER_CODE_MAX_LENGTH) {
      throw new InvalidPrimitiveError(
        'SupplierCode',
        `value must be at most ${SUPPLIER_CODE_MAX_LENGTH} characters but received ${trimmed.length}`,
      );
    }
    return new SupplierCode(trimmed);
  }

  public equals(other: unknown): boolean {
    return other instanceof SupplierCode && other.value === this.value;
  }

  public toString(): string {
    return this.value;
  }
}
