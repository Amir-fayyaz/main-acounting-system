import { describe, expect, it } from 'vitest';

import { validatePurchaseForm } from '../lib/purchases.validation';

const VALID = {
  supplier: 'شرکت آرمان تجارت',
  total: '1000000',
  discountPercent: '0',
  due: '',
  description: '',
};

describe('purchases validation', () => {
  it('requires a supplier and a positive total', () => {
    const errors = validatePurchaseForm({ ...VALID, supplier: '', total: '0' });
    expect(errors.supplier).toBeTruthy();
    expect(errors.total).toBeTruthy();
  });

  it('rejects a discount outside 0–100', () => {
    expect(validatePurchaseForm({ ...VALID, discountPercent: '-1' }).discountPercent).toBeTruthy();
    expect(validatePurchaseForm({ ...VALID, discountPercent: '101' }).discountPercent).toBeTruthy();
  });

  it('accepts a valid purchase', () => {
    expect(validatePurchaseForm(VALID)).toEqual({});
  });
});
