import { describe, expect, it } from 'vitest';

import {
  SupplierCodeDuplicateError,
  SupplierIdentificationDuplicateError,
  SupplierInactiveError,
  SupplierNotFoundError,
} from './supplier.errors.js';

describe('supplier errors', () => {
  it('exposes the required stable codes and categories', () => {
    expect(new SupplierCodeDuplicateError('SUP-001').code).toBe('SUPPLIER_CODE_DUPLICATE');
    expect(new SupplierCodeDuplicateError('SUP-001').category).toBe('CONFLICT');

    expect(new SupplierIdentificationDuplicateError('10100999999').code).toBe(
      'SUPPLIER_IDENTIFICATION_DUPLICATE',
    );
    expect(new SupplierIdentificationDuplicateError('10100999999').category).toBe('CONFLICT');

    expect(new SupplierNotFoundError('id').code).toBe('SUPPLIER_NOT_FOUND');
    expect(new SupplierNotFoundError('id').category).toBe('NOT_FOUND');

    expect(new SupplierInactiveError('id').code).toBe('SUPPLIER_INACTIVE');
    expect(new SupplierInactiveError('id').category).toBe('BUSINESS_RULE');
  });

  it('keeps messages client-safe and serializable', () => {
    const error = new SupplierCodeDuplicateError('SUP-001');

    expect(error.message).not.toContain('stack');
    expect(error.toJSON()).toEqual({
      code: 'SUPPLIER_CODE_DUPLICATE',
      category: 'CONFLICT',
      message: error.message,
      details: error.details,
    });
  });
});
