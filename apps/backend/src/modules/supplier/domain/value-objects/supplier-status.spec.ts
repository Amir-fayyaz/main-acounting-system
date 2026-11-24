import { describe, expect, it } from 'vitest';

import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';
import { SupplierContactInfo } from './supplier-contact-info.js';
import { SupplierStatus } from './supplier-status.js';

describe('SupplierContactInfo', () => {
  it('trims values and treats blanks as absent', () => {
    const info = SupplierContactInfo.create({
      phone: ' 021-1234 ',
      email: '   ',
      address: ' Tehran ',
      postalCode: null,
    });

    expect(info.toJSON()).toEqual({
      phone: '021-1234',
      email: undefined,
      address: 'Tehran',
      postalCode: undefined,
    });
  });

  it('rejects a non-string field', () => {
    expect(() => SupplierContactInfo.create({ phone: 123 as unknown as string })).toThrow(
      InvalidPrimitiveError,
    );
  });
});

describe('SupplierStatus', () => {
  it('accepts only active and inactive', () => {
    expect(SupplierStatus.from('active')).toBe(SupplierStatus.ACTIVE);
    expect(SupplierStatus.from('inactive')).toBe(SupplierStatus.INACTIVE);
    expect(SupplierStatus.ACTIVE.isActive()).toBe(true);
    expect(SupplierStatus.INACTIVE.isInactive()).toBe(true);
  });

  it('rejects an unknown status', () => {
    expect(() => SupplierStatus.from('deleted')).toThrow(InvalidPrimitiveError);
  });
});
