import { describe, expect, it } from 'vitest';

import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';
import { SupplierName } from './supplier-name.js';

describe('SupplierName', () => {
  it('trims but preserves the user-facing text', () => {
    const name = SupplierName.from('  شرکت فولاد مبارکه  ');

    expect(name.value).toBe('شرکت فولاد مبارکه');
    expect(name.toJSON()).toBe('شرکت فولاد مبارکه');
  });

  it('compares by display text', () => {
    expect(SupplierName.from('Acme').equals(SupplierName.from('Acme'))).toBe(true);
    expect(SupplierName.from('Acme').equals(SupplierName.from('acme'))).toBe(false);
  });

  it.each(['', '   ', 'x'.repeat(SupplierName.MAX_LENGTH + 1)])(
    'rejects an invalid value: %j',
    (value) => {
      expect(() => SupplierName.from(value)).toThrow(InvalidPrimitiveError);
    },
  );

  it('rejects a non-string value', () => {
    expect(() => SupplierName.from(null as unknown as string)).toThrow(InvalidPrimitiveError);
  });

  it('reports accepted values through isValid', () => {
    expect(SupplierName.isValid('Acme')).toBe(true);
    expect(SupplierName.isValid('')).toBe(false);
    expect(SupplierName.isValid(null)).toBe(false);
  });
});
