import { describe, expect, it } from 'vitest';

import {
  alignDecimals,
  compareDecimals,
  decimalsEqual,
  decimalFrom,
  decimalFromNumber,
  divideWithRounding,
  formatDecimal,
  MAX_DECIMAL_SCALE,
  parseDecimal,
  pow10,
  rescale,
  rescaleUp,
  trimDecimal,
} from './decimal.js';
import { InvalidPrimitiveError } from './invalid-primitive-error.js';
import { RoundingMode } from './rounding-mode.js';

describe('parseDecimal', () => {
  it('reads whole and fractional amounts exactly', () => {
    expect(parseDecimal('0', 'Money', 'amount')).toEqual({ unscaled: 0n, scale: 0 });
    expect(parseDecimal('1234.50', 'Money', 'amount')).toEqual({ unscaled: 123450n, scale: 2 });
    expect(parseDecimal('-0.5', 'Money', 'amount')).toEqual({ unscaled: -5n, scale: 1 });
    expect(parseDecimal('0.00', 'Money', 'amount')).toEqual({ unscaled: 0n, scale: 2 });
    expect(parseDecimal('007', 'Money', 'amount')).toEqual({ unscaled: 7n, scale: 0 });
  });

  it.each([
    ['an empty string', ''],
    ['whitespace', '   '],
    ['a trailing dot', '1.'],
    ['a leading dot', '.5'],
    ['a plus sign', '+1'],
    ['exponent notation', '1e5'],
    ['a hex literal', '0x10'],
    ['a thousands separator', '1_000'],
    ['a unit suffix', '12 USD'],
  ])('rejects %s', (_label, value) => {
    expect(() => parseDecimal(value, 'Money', 'amount')).toThrow(InvalidPrimitiveError);
    expect(() => parseDecimal(value, 'Money', 'amount')).toThrow(
      'Money: amount must be a plain decimal string',
    );
  });

  it('rejects a non-string at runtime', () => {
    expect(() => parseDecimal(12 as unknown as string, 'Money', 'amount')).toThrow(
      'Money: amount must be a plain decimal string',
    );
  });

  it('rejects more fractional digits than the kernel supports', () => {
    const tooManyDigits = `0.${'0'.repeat(MAX_DECIMAL_SCALE)}1`;
    expect(() => parseDecimal(tooManyDigits, 'Quantity', 'amount')).toThrow(
      `Quantity: amount must not have more than ${MAX_DECIMAL_SCALE} fractional digits`,
    );
  });
});

describe('decimalFromNumber', () => {
  it('reads a number through its shortest decimal form, not its binary value', () => {
    expect(decimalFromNumber(0.1, 'Money', 'amount')).toEqual({ unscaled: 1n, scale: 1 });
    expect(decimalFromNumber(1.5, 'Money', 'amount')).toEqual({ unscaled: 15n, scale: 1 });
    expect(decimalFromNumber(-0, 'Money', 'amount')).toEqual({ unscaled: 0n, scale: 0 });
  });

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
  ])('rejects %s', (_label, value) => {
    expect(() => decimalFromNumber(value, 'Money', 'amount')).toThrow(
      'Money: amount must be a finite number',
    );
  });

  it('rejects a number that would print in exponent notation', () => {
    expect(() => decimalFromNumber(1e21, 'Money', 'amount')).toThrow(
      'Money: amount must not use exponent notation',
    );
  });

  it('routes strings through the string parser', () => {
    expect(decimalFrom('12.5', 'Money', 'amount')).toEqual({ unscaled: 125n, scale: 1 });
  });
});

describe('divideWithRounding', () => {
  it('returns the exact quotient when it divides evenly', () => {
    expect(divideWithRounding(7n, 7n, RoundingMode.DOWN)).toBe(1n);
    expect(divideWithRounding(-8n, 4n, RoundingMode.HALF_UP)).toBe(-2n);
  });

  it('applies every rounding rule to a positive tie', () => {
    // 5 / 2 = 2.5
    expect(divideWithRounding(5n, 2n, RoundingMode.HALF_UP)).toBe(3n);
    expect(divideWithRounding(5n, 2n, RoundingMode.HALF_EVEN)).toBe(2n);
    expect(divideWithRounding(5n, 2n, RoundingMode.DOWN)).toBe(2n);
    expect(divideWithRounding(5n, 2n, RoundingMode.UP)).toBe(3n);
    expect(divideWithRounding(5n, 2n, RoundingMode.FLOOR)).toBe(2n);
    expect(divideWithRounding(5n, 2n, RoundingMode.CEILING)).toBe(3n);
  });

  it('applies every rounding rule to a negative tie', () => {
    // -5 / 2 = -2.5
    expect(divideWithRounding(-5n, 2n, RoundingMode.HALF_UP)).toBe(-3n);
    expect(divideWithRounding(-5n, 2n, RoundingMode.HALF_EVEN)).toBe(-2n);
    expect(divideWithRounding(-5n, 2n, RoundingMode.DOWN)).toBe(-2n);
    expect(divideWithRounding(-5n, 2n, RoundingMode.UP)).toBe(-3n);
    expect(divideWithRounding(-5n, 2n, RoundingMode.FLOOR)).toBe(-3n);
    expect(divideWithRounding(-5n, 2n, RoundingMode.CEILING)).toBe(-2n);
  });

  it('breaks a tie towards the even digit for HALF_EVEN', () => {
    expect(divideWithRounding(7n, 2n, RoundingMode.HALF_EVEN)).toBe(4n);
    expect(divideWithRounding(9n, 2n, RoundingMode.HALF_EVEN)).toBe(4n);
  });

  it('rounds a non-tie to the nearer value', () => {
    expect(divideWithRounding(7n, 3n, RoundingMode.HALF_UP)).toBe(2n);
    expect(divideWithRounding(8n, 3n, RoundingMode.HALF_UP)).toBe(3n);
    expect(divideWithRounding(-7n, 3n, RoundingMode.HALF_UP)).toBe(-2n);
  });

  it('rejects division by zero and an unknown rounding rule', () => {
    expect(() => divideWithRounding(1n, 0n, RoundingMode.HALF_UP)).toThrow(
      'Decimal: division by zero',
    );
    expect(() => divideWithRounding(1n, 2n, 'ROUND_AWAY_FROM_ZERO' as RoundingMode)).toThrow(
      'Decimal: rounding must be one of',
    );
  });
});

describe('rescale and alignment', () => {
  it('adds zeroes when increasing precision', () => {
    expect(rescaleUp({ unscaled: 15n, scale: 1 }, 3)).toEqual({ unscaled: 1500n, scale: 3 });
    expect(rescale({ unscaled: 15n, scale: 1 }, 3, RoundingMode.HALF_UP)).toEqual({
      unscaled: 1500n,
      scale: 3,
    });
  });

  it('rounds away precision when decreasing it', () => {
    expect(rescale({ unscaled: 1234n, scale: 2 }, 0, RoundingMode.HALF_UP).unscaled).toBe(12n);
    expect(rescale({ unscaled: 1234n, scale: 2 }, 0, RoundingMode.CEILING).unscaled).toBe(13n);
    expect(rescale({ unscaled: 1234n, scale: 2 }, 1, RoundingMode.DOWN).unscaled).toBe(123n);
  });

  it('refuses to move to a smaller scale through rescaleUp', () => {
    expect(() => rescaleUp({ unscaled: 1234n, scale: 2 }, 1)).toThrow(
      'Decimal: cannot raise a scale of 2 to the smaller scale 1',
    );
  });

  it('rejects an out-of-range target scale', () => {
    expect(() => rescale({ unscaled: 1n, scale: 0 }, -1, RoundingMode.HALF_UP)).toThrow(
      'Decimal: scale must be between 0 and 18',
    );
  });

  it('aligns both operands without losing a digit', () => {
    expect(alignDecimals({ unscaled: 15n, scale: 1 }, { unscaled: 25n, scale: 2 })).toEqual([
      { unscaled: 150n, scale: 2 },
      { unscaled: 25n, scale: 2 },
    ]);
  });
});

describe('comparison, trimming and formatting', () => {
  it('compares by value across different scales', () => {
    expect(compareDecimals({ unscaled: 150n, scale: 2 }, { unscaled: 15n, scale: 1 })).toBe(0);
    expect(compareDecimals({ unscaled: 151n, scale: 2 }, { unscaled: 15n, scale: 1 })).toBe(1);
    expect(compareDecimals({ unscaled: -15n, scale: 1 }, { unscaled: 15n, scale: 1 })).toBe(-1);
    expect(decimalsEqual({ unscaled: 150n, scale: 2 }, { unscaled: 15n, scale: 1 })).toBe(true);
    expect(decimalsEqual({ unscaled: 151n, scale: 2 }, { unscaled: 15n, scale: 1 })).toBe(false);
  });

  it('drops insignificant trailing zeroes', () => {
    expect(trimDecimal({ unscaled: 1500n, scale: 2 })).toEqual({ unscaled: 15n, scale: 0 });
    expect(trimDecimal({ unscaled: 0n, scale: 3 })).toEqual({ unscaled: 0n, scale: 0 });
    expect(trimDecimal({ unscaled: -1050n, scale: 2 })).toEqual({ unscaled: -105n, scale: 1 });
    expect(trimDecimal({ unscaled: 1234n, scale: 2 })).toEqual({ unscaled: 1234n, scale: 2 });
  });

  it('reports the sign', () => {
    expect(pow10(0)).toBe(1n);
    expect(pow10(3)).toBe(1000n);
    expect(() => pow10(-1)).toThrow('Decimal: exponent must be a non-negative integer');
    expect(() => pow10(1.5)).toThrow('Decimal: exponent must be a non-negative integer');
  });

  it('formats with exactly the scale it holds', () => {
    expect(formatDecimal({ unscaled: 125000n, scale: 0 })).toBe('125000');
    expect(formatDecimal({ unscaled: 5n, scale: 2 })).toBe('0.05');
    expect(formatDecimal({ unscaled: -150n, scale: 2 })).toBe('-1.50');
    expect(formatDecimal({ unscaled: 0n, scale: 2 })).toBe('0.00');
    expect(formatDecimal({ unscaled: 0n, scale: 0 })).toBe('0');
    expect(formatDecimal({ unscaled: -7n, scale: 0 })).toBe('-7');
  });
});
