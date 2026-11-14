import { describe, expect, it } from 'vitest';

import { validateSaleForm } from '../lib/sales.validation';

const VALID = {
  cust: 'شرکت آرمان تجارت',
  seller: 'نگار فرهادی',
  branch: 'دفتر مرکزی',
  desc: '',
  gross: '1000000',
  discountPercent: '0',
  taxPercent: '0',
};

describe('sales validation', () => {
  it('requires customer and seller', () => {
    const errors = validateSaleForm({ ...VALID, cust: '', seller: '' });
    expect(errors.cust).toBeTruthy();
    expect(errors.seller).toBeTruthy();
  });

  it('rejects a non-positive gross amount', () => {
    expect(validateSaleForm({ ...VALID, gross: '0' }).gross).toBeTruthy();
    expect(validateSaleForm({ ...VALID, gross: 'abc' }).gross).toBeTruthy();
  });

  it('accepts a valid invoice', () => {
    expect(validateSaleForm(VALID)).toEqual({});
  });
});
