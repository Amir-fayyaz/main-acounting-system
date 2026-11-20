import { describe, expect, it } from 'vitest';

import { padFaDay, toFaDigits } from '../utils/persian-digits';

describe('toFaDigits', () => {
  it('converts ASCII digits to Persian digits', () => {
    expect(toFaDigits('123')).toBe('۱۲۳');
    expect(toFaDigits('0912')).toBe('۰۹۱۲');
  });

  it('leaves strings without digits unchanged', () => {
    expect(toFaDigits('abc')).toBe('abc');
    expect(toFaDigits('')).toBe('');
  });

  it('converts only the digits in mixed text and numbers', () => {
    expect(toFaDigits('invoice 42')).toBe('invoice ۴۲');
    expect(toFaDigits('فاکتور 2218')).toBe('فاکتور ۲۲۱۸');
  });
});

describe('padFaDay', () => {
  it('pads single-digit days with a Persian zero', () => {
    expect(padFaDay(5)).toBe('۰۵');
    expect(padFaDay(1)).toBe('۰۱');
    expect(padFaDay(7)).toBe('۰۷');
  });

  it('keeps two-digit days as two Persian digits', () => {
    expect(padFaDay(12)).toBe('۱۲');
    expect(padFaDay(31)).toBe('۳۱');
  });
});
