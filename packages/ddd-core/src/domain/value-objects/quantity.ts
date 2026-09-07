import { InvalidValueError } from '../errors/invalid-value.error';
import { ValueObject } from '../value-object';

/** Immutable positive quantity (stock, line items, hours, ...). */
export class Quantity extends ValueObject {
  private constructor(public readonly value: number) {
    super();
  }

  static of(value: number): Quantity {
    if (!Number.isFinite(value) || value <= 0) throw new InvalidValueError('Quantity must be a positive number');
    return new Quantity(value);
  }
}
