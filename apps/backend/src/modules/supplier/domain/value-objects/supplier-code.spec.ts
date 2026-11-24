import { describe, expect, it } from 'vitest';

import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';
import { SupplierCode } from './supplier-code.js';

describe('SupplierCode', () => {
  it('trims and keeps the display spelling', () => {
    const code = SupplierCode.from('  SUP-001  ');

    expect(code.value).toBe('SUP-001');
    expect(code.toString()).toBe('SUP-001');
    expect(code.toJSON()).toBe('SUP-001');
  });

  it('compares case-insensitively', () => {
    expect(SupplierCode.from('SUP-001').equals(SupplierCode.from('sup-001'))).toBe(true);
    expect(SupplierCode.from('SUP-001').equals(SupplierCode.from('SUP-002'))).toBe(false);
  });

  it.each(['', '   ', 'x'.repeat(SupplierCode.MAX_LENGTH + 1)])(
    'rejects an invalid value: %j',
    (value) => {
      expect(() => SupplierCode.from(value)).toThrow(InvalidPrimitiveError);
    },
  );

  it('rejects a non-string value', () => {
    expect(() => SupplierCode.from(42 as unknown as string)).toThrow(InvalidPrimitiveError);
  });

  it('reports accepted values through isValid', () => {
    expect(SupplierCode.isValid('SUP-001')).toBe(true);
    expect(SupplierCode.isValid('   ')).toBe(false);
    expect(SupplierCode.isValid(42)).toBe(false);
  });
});
