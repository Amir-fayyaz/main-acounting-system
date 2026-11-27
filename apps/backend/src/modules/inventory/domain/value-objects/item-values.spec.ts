import { describe, expect, it } from 'vitest';
import { ItemCode } from './item-code.js';
import { ItemName } from './item-name.js';
import { ItemBarcode } from './item-barcode.js';
import { UnitOfMeasure } from './unit-of-measure.js';

describe.each([
  { label: 'code', type: ItemCode, limit: 50, valid: 'ITM-001' },
  { label: 'name', type: ItemName, limit: 200, valid: '\u06a9\u0627\u063a\u0630 A4' },
  { label: 'barcode', type: ItemBarcode, limit: 100, valid: '001234567890' },
])('Item $label', ({ type, limit, valid }) => {
  it('trims the value while preserving display spelling and leading zeroes', () => {
    const value = type.create(`  ${valid}  `).valueOrThrow();
    expect(value.value).toBe(valid);
    expect(value.toJSON()).toBe(valid);
    expect(Object.isFrozen(value)).toBe(true);
  });

  it.each(['', '  ', null, undefined, 123])('refuses invalid input %j as a Result', (raw) => {
    const result = type.create(raw);
    expect(result.isFail()).toBe(true);
    expect(result.errorOrThrow().category).toBe('VALIDATION');
  });

  it('accepts the length boundary and refuses longer values', () => {
    expect(type.create('a'.repeat(limit)).isOk()).toBe(true);
    expect(type.create('a'.repeat(limit + 1)).isFail()).toBe(true);
  });
});

describe('Item value equality', () => {
  it('compares codes without case while keeping display names and barcodes exact', () => {
    expect(
      ItemCode.create('ITM-A').valueOrThrow().equals(ItemCode.create('itm-a').valueOrThrow()),
    ).toBe(true);
    expect(
      ItemCode.create('ITM-A').valueOrThrow().equals(ItemCode.create('ITM-B').valueOrThrow()),
    ).toBe(false);
    expect(
      ItemName.create('Paper').valueOrThrow().equals(ItemName.create('paper').valueOrThrow()),
    ).toBe(false);
    expect(
      ItemBarcode.create('001').valueOrThrow().equals(ItemBarcode.create('1').valueOrThrow()),
    ).toBe(false);
    expect(
      ItemBarcode.create('ABC').valueOrThrow().equals(ItemBarcode.create('abc').valueOrThrow()),
    ).toBe(false);
  });
});

describe('UnitOfMeasure', () => {
  it.each(['piece', 'kilogram', 'gram', 'meter', 'liter', 'box', 'pack'])(
    'accepts system unit %s',
    (code) => {
      const unit = UnitOfMeasure.create(code).valueOrThrow();
      expect(unit.value).toBe(code);
      expect(unit.toJSON()).toBe(code);
      expect(Object.isFrozen(unit)).toBe(true);
    },
  );

  it.each(['', 'crate', 'PACK', ' pack ', null, undefined, 1])(
    'refuses non-system unit %j',
    (raw) => {
      const error = UnitOfMeasure.create(raw).errorOrThrow();
      expect(error.code).toBe('ITEM_UNIT_INVALID');
      expect(error.category).toBe('VALIDATION');
    },
  );
});
