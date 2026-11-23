import { describeValue } from '../../../../shared/primitives/assert.js';
import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';

/** The two lifecycle states a supplier can be in (PUR-001). */
export type SupplierStatusValue = 'active' | 'inactive';

/**
 * The operational status of a supplier (PUR-001).
 *
 * A supplier is created active and can be deactivated and reactivated. There is
 * deliberately no `deleted` state: an inactive supplier stays available to the
 * historical records that reference it, while new operations are refused by the
 * application. The value object is immutable and shared by identity.
 */
export class SupplierStatus {
  public static readonly ACTIVE = new SupplierStatus('active');
  public static readonly INACTIVE = new SupplierStatus('inactive');

  public readonly value: SupplierStatusValue;

  private constructor(value: SupplierStatusValue) {
    this.value = value;
  }

  /**
   * Wraps a stored status.
   *
   * @throws InvalidPrimitiveError - anything other than `active` or `inactive`.
   */
  public static from(value: string): SupplierStatus {
    if (value === SupplierStatus.ACTIVE.value) return SupplierStatus.ACTIVE;
    if (value === SupplierStatus.INACTIVE.value) return SupplierStatus.INACTIVE;
    throw new InvalidPrimitiveError(
      'SupplierStatus',
      `value must be "active" or "inactive" but received ${describeValue(value)}`,
    );
  }

  public isActive(): boolean {
    return this.value === 'active';
  }

  public isInactive(): boolean {
    return this.value === 'inactive';
  }

  public equals(other: unknown): boolean {
    return other instanceof SupplierStatus && other.value === this.value;
  }

  public toString(): string {
    return this.value;
  }

  /** Serializes as the bare status text (FND-006). */
  public toJSON(): string {
    return this.value;
  }
}
