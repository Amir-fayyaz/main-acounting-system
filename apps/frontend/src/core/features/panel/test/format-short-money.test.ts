import { describe, expect, it } from 'vitest';

import { formatShortMoney, splitShortMoney } from '../utils/format-short-money';

describe('formatShortMoney', () => {
  it('formats billion-scale amounts with one Persian decimal digit', () => {
    expect(formatShortMoney('48200000000')).toBe('۴۸٫۲ میلیارد ریال');
    expect(formatShortMoney('48200000000.00')).toBe('۴۸٫۲ میلیارد ریال');
    expect(formatShortMoney(48200000000)).toBe('۴۸٫۲ میلیارد ریال');
  });

  it('formats whole billions without a decimal separator', () => {
    expect(formatShortMoney('1000000000')).toBe('۱ میلیارد ریال');
    expect(formatShortMoney('2000000000')).toBe('۲ میلیارد ریال');
  });

  it('rounds half up, carrying into the whole part when needed', () => {
    expect(formatShortMoney('1550000000')).toBe('۱٫۶ میلیارد ریال');
    expect(formatShortMoney('1999999999')).toBe('۲ میلیارد ریال');
  });

  it('matches the prototype fa() rounding for exact-half decimal cases', () => {
    // Prototype: fa(n / 1e9) via toLocaleString('fa-IR', { maximumFractionDigits: 1 }).
    expect(formatShortMoney('1450000000')).toBe('۱٫۵ میلیارد ریال');
    expect(formatShortMoney('1550000000')).toBe('۱٫۶ میلیارد ریال');
    expect(formatShortMoney('1999999999')).toBe('۲ میلیارد ریال');
  });

  it('formats values around the million and billion thresholds', () => {
    expect(formatShortMoney('999999')).toBe('۹۹۹٬۹۹۹ ریال');
    expect(formatShortMoney('1000000')).toBe('۱ میلیون ریال');
    expect(formatShortMoney('999999999')).toBe('۱٬۰۰۰ میلیون ریال');
    expect(formatShortMoney('1000000000')).toBe('۱ میلیارد ریال');
  });

  it('formats million-scale amounts', () => {
    expect(formatShortMoney('5000000')).toBe('۵ میلیون ریال');
    expect(formatShortMoney('48200000')).toBe('۴۸٫۲ میلیون ریال');
  });

  it('falls back to full grouped formatting below one million', () => {
    expect(formatShortMoney('999999')).toBe('۹۹۹٬۹۹۹ ریال');
    expect(formatShortMoney('0')).toBe('۰ ریال');
  });

  it('keeps the short form for negative amounts', () => {
    expect(formatShortMoney('-1500000000')).toBe('-۱٫۵ میلیارد ریال');
    expect(formatShortMoney('-1450000000')).toBe('-۱٫۵ میلیارد ریال');
    expect(formatShortMoney('-48200000000')).toBe('-۴۸٫۲ میلیارد ریال');
  });

  it('returns malformed input unchanged instead of throwing', () => {
    expect(formatShortMoney('abc')).toBe('abc');
    expect(formatShortMoney('')).toBe('');
    expect(formatShortMoney('-')).toBe('-');
  });

  it('groups huge values without precision loss beyond safe integers', () => {
    expect(formatShortMoney('9007199254740993000')).toBe('۹٬۰۰۷٬۱۹۹٬۲۵۴٫۷ میلیارد ریال');
  });
});

describe('splitShortMoney', () => {
  it('splits the amount from the unit at the first space', () => {
    expect(splitShortMoney('۴۸٫۲ میلیارد ریال')).toEqual({
      amount: '۴۸٫۲',
      unit: 'میلیارد ریال',
    });
    expect(splitShortMoney('۶۱۲ میلیون ریال')).toEqual({ amount: '۶۱۲', unit: 'میلیون ریال' });
    expect(splitShortMoney('۹۹۹٬۹۹۹ ریال')).toEqual({ amount: '۹۹۹٬۹۹۹', unit: 'ریال' });
    expect(splitShortMoney('-۱٫۵ میلیارد ریال')).toEqual({
      amount: '-۱٫۵',
      unit: 'میلیارد ریال',
    });
  });

  it('keeps a unit-less label as the amount', () => {
    expect(splitShortMoney('بدون-فاصله')).toEqual({ amount: 'بدون-فاصله', unit: '' });
    expect(splitShortMoney('')).toEqual({ amount: '', unit: '' });
  });
});
