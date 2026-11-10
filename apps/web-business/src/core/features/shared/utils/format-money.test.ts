import { describe, expect, it } from 'vitest';

import { formatMoney } from '../utils/format-money';

describe('formatMoney', () => {
  it('formats valid integer money strings with Persian digits and grouping', () => {
    expect(formatMoney('125000000.00')).toBe('۱۲۵٬۰۰۰٬۰۰۰');
    expect(formatMoney('84000000')).toBe('۸۴٬۰۰۰٬۰۰۰');
  });

  it('formats zero', () => {
    expect(formatMoney('0')).toBe('۰');
    expect(formatMoney('0.00')).toBe('۰');
  });

  it('renders empty input as zero instead of throwing', () => {
    expect(formatMoney('')).toBe('۰');
    expect(formatMoney('')).not.toContain('NaN');
  });

  it('returns malformed input unchanged instead of throwing or rendering NaN', () => {
    expect(formatMoney('abc')).toBe('abc');
    expect(formatMoney('-')).toBe('-');
    expect(() => formatMoney('not-a-number')).not.toThrow();
  });

  it('formats large values beyond safe integers without precision loss', () => {
    expect(formatMoney('48200000000.00')).toBe('۴۸٬۲۰۰٬۰۰۰٬۰۰۰');
    expect(formatMoney('9007199254740993.00')).toBe('۹٬۰۰۷٬۱۹۹٬۲۵۴٬۷۴۰٬۹۹۳');
  });
});
