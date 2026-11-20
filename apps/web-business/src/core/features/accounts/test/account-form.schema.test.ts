import { describe, expect, it } from 'vitest';

import type { AccountFormValues } from '../assets/@types/account.types';
import { accountFormSchema, mapZodErrorsToAccountFormErrors } from '../lib/account-form.schema';

function validValues(overrides: Partial<AccountFormValues> = {}): AccountFormValues {
  return {
    title: 'حساب جاری ملی',
    type: 'bank',
    bank: 'ملی',
    iban: 'IR123456789012345678901234',
    openingBalance: '125000000',
    ...overrides,
  };
}

describe('accountFormSchema', () => {
  it('normalizes Persian digits, separators, IBAN spacing and money', () => {
    const result = accountFormSchema.safeParse(
      validValues({
        title: '  حساب جاری ملی  ',
        iban: 'ir ۱۲۳۴۵۶۷۸۹۰۱۲۳۴۵۶۷۸۹۰۱۲۳۴',
        openingBalance: '۱۲۵٬۰۰۰٬۰۰۰',
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('حساب جاری ملی');
      expect(result.data.iban).toBe('IR123456789012345678901234');
      expect(result.data.openingBalance).toBe('125000000.00');
    }
  });

  it('requires bank name and IBAN for bank accounts', () => {
    const result = accountFormSchema.safeParse(validValues({ bank: '', iban: '' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = mapZodErrorsToAccountFormErrors(result.error);
      expect(errors.bank).toContain('بانک');
      expect(errors.iban).toContain('شبا');
    }
  });

  it('validates the IR IBAN format', () => {
    const missingPrefix = accountFormSchema.safeParse(
      validValues({ iban: '123456789012345678901234' }),
    );
    const tooShort = accountFormSchema.safeParse(validValues({ iban: 'IR123' }));

    expect(missingPrefix.success).toBe(false);
    expect(tooShort.success).toBe(false);
    if (!tooShort.success) {
      expect(mapZodErrorsToAccountFormErrors(tooShort.error).iban).toContain('۲۴ رقم');
    }
  });

  it('ignores bank and IBAN rules for cash and petty-cash accounts', () => {
    const result = accountFormSchema.safeParse(
      validValues({ type: 'petty-cash', bank: '', iban: '' }),
    );

    expect(result.success).toBe(true);
  });

  it('treats an empty opening balance as zero and rejects malformed money', () => {
    const empty = accountFormSchema.safeParse(validValues({ openingBalance: '' }));
    const malformed = accountFormSchema.safeParse(validValues({ openingBalance: '12.345' }));

    expect(empty.success).toBe(true);
    if (empty.success) expect(empty.data.openingBalance).toBe('0.00');

    expect(malformed.success).toBe(false);
    if (!malformed.success) {
      expect(mapZodErrorsToAccountFormErrors(malformed.error).openingBalance).toContain('موجودی');
    }
  });

  it('requires a non-empty title and maps only known fields', () => {
    const result = accountFormSchema.safeParse(validValues({ title: '   ' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = mapZodErrorsToAccountFormErrors(result.error);
      expect(errors).toEqual({ title: 'عنوان حساب را وارد کنید.' });
    }
  });
});
