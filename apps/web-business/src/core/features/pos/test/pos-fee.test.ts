import { describe, expect, it } from 'vitest';

import { formatFeePercentFa, isFeeInRange, normalizeFeeInput } from '../utils/fee';
import { formatIbanMaskFa } from '../utils/format';

describe('fee utils', () => {
  it('normalizes Persian inputs and percent signs to canonical hundredths', () => {
    expect(normalizeFeeInput('۰٫۷')).toBe('0.70');
    expect(normalizeFeeInput('1٪')).toBe('1.00');
    expect(normalizeFeeInput(' 0.5 ')).toBe('0.50');
    expect(normalizeFeeInput('abc')).toBeNull();
    expect(normalizeFeeInput('0.555')).toBeNull();
  });

  it('enforces the 0–100 range', () => {
    expect(isFeeInRange('0.00')).toBe(true);
    expect(isFeeInRange('100.00')).toBe(true);
    expect(isFeeInRange('100.01')).toBe(false);
  });

  it('formats fees with Persian digits and trims zero decimals', () => {
    expect(formatFeePercentFa('0.70')).toBe('۰٫۷٪');
    expect(formatFeePercentFa('1.00')).toBe('۱٪');
    expect(formatFeePercentFa(null)).toBe('—');
  });

  it('masks IBANs for the table', () => {
    expect(formatIbanMaskFa('IR000001000000000000000000')).toBe('IR000001…');
    expect(formatIbanMaskFa(null)).toBe('—');
  });
});
