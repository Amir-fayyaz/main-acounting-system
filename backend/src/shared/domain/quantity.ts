import { InvalidValueError } from './invalid-value.error';
export class Quantity { private constructor(public readonly value: number) {} static of(value: number): Quantity { if (!Number.isFinite(value) || value <= 0) throw new InvalidValueError('Quantity must be positive'); return new Quantity(value); } }

