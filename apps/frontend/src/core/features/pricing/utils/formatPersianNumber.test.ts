import { describe, expect, it } from 'vitest';

import { formatPersianNumber } from './formatPersianNumber';

describe('formatPersianNumber', () => {
  it('formats numbers with Persian digits and separators', () => {
    expect(formatPersianNumber(790_000)).toBe('۷۹۰٬۰۰۰');
    expect(formatPersianNumber(14_304_000)).toBe('۱۴٬۳۰۴٬۰۰۰');
  });
});
