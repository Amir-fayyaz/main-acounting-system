import { describe, expect, it } from 'vitest';
import { normalizeDigits } from '../utils/normalizeDigits';

describe('normalizeDigits', () => {
  it('ارقام فارسی و عربی را به انگلیسی تبدیل می‌کند', () => {
    expect(normalizeDigits('۰۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789');
    expect(normalizeDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });

  it('سایر کاراکترها را تغییر نمی‌دهد', () => {
    expect(normalizeDigits('a@b.co ۱۲3')).toBe('a@b.co 123');
  });
});
