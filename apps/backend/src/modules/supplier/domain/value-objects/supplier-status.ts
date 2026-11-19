export type SupplierStatusValue = 'active' | 'inactive';

/**
 * Operational status of a supplier (PUR-001; PUR-BR-001).
 * Active suppliers can be referenced by purchases and vouchers.
 * Inactive suppliers are preserved but blocked from new operations.
 */
export class SupplierStatus {
  public static readonly ACTIVE = new SupplierStatus('active');
  public static readonly INACTIVE = new SupplierStatus('inactive');

  public readonly value: SupplierStatusValue;

  private constructor(value: SupplierStatusValue) {
    this.value = value;
  }

  public static from(value: string): SupplierStatus {
    if (value === 'active') return SupplierStatus.ACTIVE;
    if (value === 'inactive') return SupplierStatus.INACTIVE;
    throw new Error(`Invalid supplier status: "${value}"`);
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
}
