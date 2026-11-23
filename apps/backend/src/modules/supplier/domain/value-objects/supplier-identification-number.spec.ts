import { describe, expect, it } from 'vitest';

import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';
import { SupplierIdentificationNumber } from './supplier-identification-number.js';

describe('SupplierIdentificationNumber', () => {
  it('accepts a national id, a legal id and an economic code', () => {
    expect(SupplierIdentificationNumber.from('0012345678').value).toBe('0012345678');
    expect(SupplierIdentificationNumber.from('10100999999').value).toBe('10100999999');
    expect(SupplierIdentificationNumber.from('41111111111111').value).toBe('41111111111111');
  });

  it('trims and folds Persian and Arabic digits to ASCII', () => {
    expect(SupplierIdentificationNumber.from(' ۱۰۱۰۰۹۹۹۹۹۹ ').value).toBe('10100999999');
    expect(SupplierIdentificationNumber.from('١٠١٠٠٩٩٩٩٩٩').value).toBe('10100999999');
  });

  it.each(['', '   ', 'SUP-001', '10100 999999', '10100-999999'])(
    'rejects a non-digits value: %j',
    (value) => {
      expect(() => SupplierIdentificationNumber.from(value)).toThrow(InvalidPrimitiveError);
    },
  );

  it('rejects an over-long value', () => {
    expect(() =>
      SupplierIdentificationNumber.from('1'.repeat(SupplierIdentificationNumber.MAX_LENGTH + 1)),
    ).toThrow(InvalidPrimitiveError);
  });

  it('rejects a non-string value', () => {
    expect(() => SupplierIdentificationNumber.from(1234567890 as unknown as string)).toThrow(
      InvalidPrimitiveError,
    );
  });

  it('compares by canonical digits', () => {
    expect(
      SupplierIdentificationNumber.from('۱۰۱۰۰۹۹۹۹۹۹').equals(
        SupplierIdentificationNumber.from('10100999999'),
      ),
    ).toBe(true);
    expect(
      SupplierIdentificationNumber.from('10100999999').equals(
        SupplierIdentificationNumber.from('10100999998'),
      ),
    ).toBe(false);
  });
});
