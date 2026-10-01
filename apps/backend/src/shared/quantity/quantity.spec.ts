import { describe, expect, it } from 'vitest';

import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';
import { RoundingMode } from '../primitives/rounding-mode.js';
import { Quantity } from './quantity.js';

describe('Quantity.of', () => {
  it('holds an amount with an optional unit code', () => {
    expect(Quantity.of('5').unit).toBeNull();
    expect(Quantity.of('5', 'kg').unit).toBe('kg');
    expect(Quantity.of('5', '  kg  ').unit).toBe('kg');
    expect(Quantity.of('5', 'kg').toDecimalString()).toBe('5');
    expect(Quantity.of('5', 'kg').toString()).toBe('5 kg');
    expect(Quantity.of('5').toString()).toBe('5');
  });

  it('keeps only the precision it needs', () => {
    expect(Quantity.of('5.0').toDecimalString()).toBe('5');
    expect(Quantity.of('5.000').toDecimalString()).toBe('5');
    expect(Quantity.of('1.50').equals(Quantity.of('1.5'))).toBe(true);
  });

  it('accepts a number through its shortest decimal form', () => {
    expect(Quantity.of(0.1).toDecimalString()).toBe('0.1');
    expect(Quantity.of(2.5, 'kg').toDecimalString()).toBe('2.5');
  });

  it.each([
    ['a blank amount', '   '],
    ['a non-numeric amount', 'many'],
    ['a trailing dot', '5.'],
    ['exponent notation', '1e5'],
    ['a non-finite number', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('rejects %s', (_label, amount) => {
    expect(() => Quantity.of(amount)).toThrow(InvalidPrimitiveError);
    expect(() => Quantity.of(amount)).toThrow('Quantity: amount');
  });

  it('rejects more fractional digits than the kernel supports', () => {
    expect(() => Quantity.of(`0.${'0'.repeat(18)}1`)).toThrow(
      'Quantity: amount must not have more than 18 fractional digits',
    );
  });

  it('rejects a unit that is blank or absurdly long', () => {
    expect(() => Quantity.of('5', '   ')).toThrow('Quantity: unit must not be blank');
    expect(() => Quantity.of('5', 'x'.repeat(65))).toThrow(
      'Quantity: unit must be at most 64 characters',
    );
    expect(() => Quantity.of('5', 5 as unknown as string)).toThrow(
      'Quantity: unit must be a string',
    );
  });

  it('treats an absent unit as a unitless count', () => {
    expect(Quantity.zero().unit).toBeNull();
    expect(Quantity.zero('kg').unit).toBe('kg');
    expect(Quantity.zero().isZero()).toBe(true);
  });
});

describe('quantity arithmetic', () => {
  it('adds and subtracts exactly across scales', () => {
    expect(Quantity.of('1.5').add(Quantity.of('0.25')).toDecimalString()).toBe('1.75');
    expect(Quantity.of('1.5').subtract(Quantity.of('0.25')).toDecimalString()).toBe('1.25');
    expect(Quantity.of('0.05').add(Quantity.of('0.05')).toDecimalString()).toBe('0.1');
    expect(Quantity.of('2').subtract(Quantity.of('2')).isZero()).toBe(true);
  });

  it('never carries binary floating point into an amount', () => {
    // 0.1 + 0.2 is 0.30000000000000004 in IEEE-754.
    expect(Quantity.of('0.1').add(Quantity.of('0.2')).toDecimalString()).toBe('0.3');
    expect(Quantity.of('0.1').multiply('3', RoundingMode.HALF_UP).toDecimalString()).toBe('0.3');
  });

  it('refuses to combine different units', () => {
    expect(() => Quantity.of('1', 'kg').add(Quantity.of('1', 'g'))).toThrow(
      'Quantity: cannot combine unit "kg" with "g"',
    );
    expect(() => Quantity.of('1', 'kg').subtract(Quantity.of('1', 'g'))).toThrow(
      InvalidPrimitiveError,
    );
    expect(() => Quantity.of('1', 'kg').compareTo(Quantity.of('1', 'g'))).toThrow(
      'Quantity: cannot combine unit',
    );
    expect(Quantity.of('1', 'kg').equals(Quantity.of('1', 'g'))).toBe(false);
  });

  it('refuses to combine a counted quantity with an uncounted one', () => {
    expect(() => Quantity.of('1', 'kg').add(Quantity.of('1'))).toThrow(
      'Quantity: cannot combine unit "kg" with null',
    );
  });

  it('rejects an operand that is not a quantity at runtime', () => {
    expect(() => Quantity.of('1').add(null as unknown as Quantity)).toThrow(
      'Quantity: expected a Quantity',
    );
  });

  it('multiplies exactly when the result fits', () => {
    expect(Quantity.of('2.5').multiply('4', RoundingMode.HALF_UP).toDecimalString()).toBe('10');
    expect(Quantity.of('1.5', 'kg').multiply('2', RoundingMode.HALF_UP).toDecimalString()).toBe(
      '3',
    );
    expect(Quantity.of('0').multiply('9', RoundingMode.HALF_UP).isZero()).toBe(true);
  });

  it('rounds only when the product exceeds the supported precision', () => {
    const tiny = Quantity.of('0.000000000000000001');
    expect(tiny.multiply('1.5', RoundingMode.HALF_UP).toDecimalString()).toBe(
      '0.000000000000000002',
    );
    expect(tiny.multiply('1.5', RoundingMode.DOWN).toDecimalString()).toBe('0.000000000000000001');
  });

  it('divides with an explicit rounding rule', () => {
    expect(Quantity.of('1').divide('4', RoundingMode.HALF_UP).toDecimalString()).toBe('0.25');
    expect(Quantity.of('1').divide('3', RoundingMode.HALF_UP).toDecimalString()).toBe(
      '0.333333333333333333',
    );
    expect(Quantity.of('10').divide('4', RoundingMode.HALF_UP).toDecimalString()).toBe('2.5');
    expect(Quantity.of('-1').divide('4', RoundingMode.HALF_UP).toDecimalString()).toBe('-0.25');
    expect(() => Quantity.of('1').divide(0, RoundingMode.HALF_UP)).toThrow(
      'Quantity: division by zero',
    );
  });

  it('negates and takes the magnitude', () => {
    expect(Quantity.of('-5', 'kg').negate().toDecimalString()).toBe('5');
    expect(Quantity.of('-5', 'kg').abs().toDecimalString()).toBe('5');
    expect(Quantity.of('5', 'kg').negate().unit).toBe('kg');
  });
});

describe('quantity signs and ordering', () => {
  it('allows negative and zero values so policy stays with the owning domain', () => {
    expect(Quantity.of('-5', 'pcs').isNegative()).toBe(true);
    expect(Quantity.of('-5', 'pcs').isPositive()).toBe(false);
    expect(Quantity.of('5', 'pcs').isPositive()).toBe(true);
    expect(Quantity.zero('pcs').isZero()).toBe(true);
    expect(Quantity.zero('pcs').isPositive()).toBe(false);
  });

  it('orders within one unit', () => {
    expect(Quantity.of('1').compareTo(Quantity.of('2'))).toBe(-1);
    expect(Quantity.of('2').compareTo(Quantity.of('1'))).toBe(1);
    expect(Quantity.of('1.50').compareTo(Quantity.of('1.5'))).toBe(0);
    expect(Quantity.of('-1').compareTo(Quantity.of('1'))).toBe(-1);
  });

  it('is value-based', () => {
    expect(Quantity.of('5').equals(Quantity.of('5.000'))).toBe(true);
    expect(Quantity.of('5').equals(Quantity.of('5.01'))).toBe(false);
    expect(Quantity.of('5').equals(null as unknown as Quantity)).toBe(false);
  });
});

describe('Quantity serialization', () => {
  it('emits a decimal string plus an explicit unit key', () => {
    expect(Quantity.of('2.5', 'kg').toJSON()).toEqual({ amount: '2.5', unit: 'kg' });
    expect(Quantity.of('2.5').toJSON()).toEqual({ amount: '2.5', unit: null });
    expect(JSON.parse(JSON.stringify(Quantity.of('2.5', 'kg')))).toEqual({
      amount: '2.5',
      unit: 'kg',
    });
  });

  it('never serializes an amount as a JSON number', () => {
    expect(typeof Quantity.of('0.1').toJSON().amount).toBe('string');
  });
});
