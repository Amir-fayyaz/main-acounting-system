import { ValueObject } from '@accounting-saas/ddd-core';
import { InvalidValueError } from '@shared/domain/invalid-value.error';

/**
 * Inventory valuation policy for a tenant (BR-REPORT-002). `FIFO` is the
 * default applied at tenant creation; `LIFO` is an explicit opt-in.
 */
export type InventoryValuationMethodValue = 'FIFO' | 'LIFO';

export class InventoryValuationMethod extends ValueObject {
  private constructor(public readonly value: InventoryValuationMethodValue) {
    super();
  }

  static DEFAULT: InventoryValuationMethodValue = 'FIFO';

  static of(candidate: string): InventoryValuationMethod {
    if (candidate !== 'FIFO' && candidate !== 'LIFO') {
      throw new InvalidValueError('Inventory valuation method must be FIFO or LIFO');
    }
    return new InventoryValuationMethod(candidate);
  }

  static fifo(): InventoryValuationMethod {
    return new InventoryValuationMethod('FIFO');
  }

  static lifo(): InventoryValuationMethod {
    return new InventoryValuationMethod('LIFO');
  }

  toString(): string {
    return this.value;
  }
}
