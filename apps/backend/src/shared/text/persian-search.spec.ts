import { describe, expect, it } from 'vitest';

import { matchesPersianSearch, normalizePersianSearch } from './persian-search.js';

describe('normalizePersianSearch', () => {
  it('folds Arabic yeh and alef maksura to the Persian yeh', () => {
    expect(normalizePersianSearch('دارايي')).toBe('دارایی');
    expect(normalizePersianSearch('موسى')).toBe('موسی');
  });

  it('folds the Arabic kaf to the Persian keheh', () => {
    expect(normalizePersianSearch('بانك')).toBe('بانک');
  });

  it('folds Persian and Arabic-Indic digits to ASCII', () => {
    expect(normalizePersianSearch('حساب ۱۲۳')).toBe('حساب 123');
    expect(normalizePersianSearch('حساب ١٢٣')).toBe('حساب 123');
  });

  it('removes the zero-width non-joiner, diacritics and tatweel', () => {
    expect(normalizePersianSearch('دارایی‌ها')).toBe('داراییها');
    expect(normalizePersianSearch('حَساب')).toBe('حساب');
    expect(normalizePersianSearch('حســـاب')).toBe('حساب');
  });

  it('trims and collapses whitespace and folds case', () => {
    expect(normalizePersianSearch('  Cash   Account  ')).toBe('cash account');
  });
});

describe('matchesPersianSearch', () => {
  it('matches a name written with a different yeh and kaf', () => {
    expect(matchesPersianSearch('حساب‌های دریافتنی', 'دريافتنى')).toBe(true);
    expect(matchesPersianSearch('بانک ملت', 'بانك')).toBe(true);
  });

  it('matches a code written with Persian or Arabic-Indic digits', () => {
    expect(matchesPersianSearch('110101', '۱۱۰۱۰۱')).toBe(true);
    expect(matchesPersianSearch('110101', '١١٠١٠١')).toBe(true);
  });

  it('matches a name whose ZWNJ the user typed as nothing', () => {
    expect(matchesPersianSearch('دارایی‌ها', 'داراییها')).toBe(true);
  });

  it('treats an empty needle as matching everything', () => {
    expect(matchesPersianSearch('anything', '')).toBe(true);
    expect(matchesPersianSearch('anything', '   ')).toBe(true);
  });

  it('does not match an unrelated value', () => {
    expect(matchesPersianSearch('بانک ملت', 'صندوق')).toBe(false);
  });
});
