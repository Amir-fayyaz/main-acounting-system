import { describe, expect, it } from 'vitest';

import { formatMoney } from '../utils/format';

describe('purchases format utils', () => {
  it('formats money with Persian digits and no decimals', () => {
    expect(formatMoney('1234567')).toBe('۱٬۲۳۴٬۵۶۷');
    expect(formatMoney(0)).toBe('۰');
  });

  it('returns the raw value for non-numeric input', () => {
    expect(formatMoney('—')).toBe('—');
  });
});
