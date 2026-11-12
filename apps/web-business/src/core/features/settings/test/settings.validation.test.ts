import { describe, expect, it } from 'vitest';

import type { CompanyInfo } from '../assets/@types/settings';
import { normalizeDigits, validateCompanyInfo } from '../lib/settings.validation';

const VALID_COMPANY: CompanyInfo = {
  companyName: 'شرکت نمونه',
  nationalId: '۱۴۰۰۱۲۳۴۵۶۷',
  fiscalYearStart: '۱۴۰۵/۰۱/۰۱',
  currency: 'IRR',
};

describe('settings validation', () => {
  it('accepts the seeded company values', () => {
    expect(validateCompanyInfo(VALID_COMPANY)).toEqual({});
  });

  it('requires a company name', () => {
    expect(validateCompanyInfo({ ...VALID_COMPANY, companyName: '  ' }).companyName).toBeDefined();
  });

  it('accepts an 11-digit national id in Persian or Latin digits', () => {
    expect(validateCompanyInfo({ ...VALID_COMPANY, nationalId: '14001234567' })).toEqual({});
    expect(validateCompanyInfo({ ...VALID_COMPANY, nationalId: '۱۴۰۰۱۲۳۴۵۶۷' })).toEqual({});
  });

  it('rejects a national id that is not 11 digits', () => {
    expect(validateCompanyInfo({ ...VALID_COMPANY, nationalId: '12345' }).nationalId).toBeDefined();
  });

  it('normalizes digits and separators', () => {
    expect(normalizeDigits('۱۴۰۰ ۱۲۳-۴۵۶۷')).toBe('14001234567');
  });

  it('rejects an unsupported currency', () => {
    expect(
      validateCompanyInfo({ ...VALID_COMPANY, currency: 'USD' as never }).currency,
    ).toBeDefined();
  });

  it('requires a fiscal year start', () => {
    expect(
      validateCompanyInfo({ ...VALID_COMPANY, fiscalYearStart: '' }).fiscalYearStart,
    ).toBeDefined();
  });
});
