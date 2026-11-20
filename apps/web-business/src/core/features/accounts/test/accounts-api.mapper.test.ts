import { describe, expect, it } from 'vitest';

import type { AccountDto } from '../assets/@types/account.types';
import {
  createEmptyAccountFormValues,
  mapAccountFormValuesToCreateRequest,
} from '../lib/account-form.mapper';
import { AccountApiError } from '../lib/accounts-api.errors';
import { mapAccountDtoToAccount } from '../lib/accounts-api.mapper';

function dto(overrides: Partial<AccountDto> = {}): AccountDto {
  return {
    id: 'account-1001',
    revision: 2,
    title: 'حساب جاری ملی دفتر مرکزی',
    type: 'bank',
    bank: 'ملی',
    iban: 'IR000001000000000000000000',
    branch: 'دفتر مرکزی',
    balance: { amount: '125000000.00', currency: 'IRR' },
    status: 'active',
    ...overrides,
  };
}

describe('mapAccountDtoToAccount', () => {
  it('maps the API DTO and keeps money as a canonical string', () => {
    const account = mapAccountDtoToAccount(dto());

    expect(account).toMatchObject({
      id: 'account-1001',
      revision: 2,
      title: 'حساب جاری ملی دفتر مرکزی',
      type: 'bank',
      bank: 'ملی',
      iban: 'IR000001000000000000000000',
      branch: 'دفتر مرکزی',
      balance: { amount: '125000000.00', currency: 'IRR' },
      status: 'active',
    });
  });

  it('normalizes Persian digits, separators and lower-case IBANs', () => {
    const account = mapAccountDtoToAccount(
      dto({
        balance: { amount: '۱۲۵٬۰۰۰٬۰۰۰', currency: 'IRR' },
        iban: 'ir 000001 000000000000000000',
        bank: '  ملی  ',
      }),
    );

    expect(account.balance.amount).toBe('125000000.00');
    expect(account.iban).toBe('IR000001000000000000000000');
    expect(account.bank).toBe('ملی');
  });

  it('keeps bank and IBAN empty for cash accounts', () => {
    const account = mapAccountDtoToAccount(
      dto({ type: 'cash', bank: null, iban: null, branch: null }),
    );

    expect(account.bank).toBeNull();
    expect(account.iban).toBeNull();
    expect(account.branch).toBeNull();
  });

  it('throws a MALFORMED_RESPONSE API error for broken money', () => {
    expect(() =>
      mapAccountDtoToAccount(dto({ balance: { amount: 'abc', currency: 'IRR' } })),
    ).toThrow(AccountApiError);

    try {
      mapAccountDtoToAccount(dto({ balance: { amount: '12.5', currency: 'IRR' } }));
    } catch (error) {
      expect(error).toBeInstanceOf(AccountApiError);
      expect((error as AccountApiError).code).toBe('MALFORMED_RESPONSE');
    }
  });
});

describe('account form mapper', () => {
  it('creates an empty bank form by default', () => {
    expect(createEmptyAccountFormValues()).toEqual({
      title: '',
      type: 'bank',
      bank: '',
      iban: '',
      openingBalance: '',
    });
  });

  it('builds a canonical create request for a bank account', () => {
    const request = mapAccountFormValuesToCreateRequest({
      title: '  حساب جاری جدید ',
      type: 'bank',
      bank: ' ملی ',
      iban: 'ir 123456789012345678901234',
      openingBalance: '۱۲۵٬۰۰۰٬۰۰۰',
    });

    expect(request).toEqual({
      title: 'حساب جاری جدید',
      type: 'bank',
      bank: 'ملی',
      iban: 'IR123456789012345678901234',
      openingBalance: { amount: '125000000.00', currency: 'IRR' },
    });
  });

  it('nulls bank/IBAN for non-bank accounts and treats an empty balance as zero', () => {
    const request = mapAccountFormValuesToCreateRequest({
      title: 'صندوق جدید',
      type: 'cash',
      bank: 'ملی',
      iban: 'IR123456789012345678901234',
      openingBalance: '',
    });

    expect(request.bank).toBeNull();
    expect(request.iban).toBeNull();
    expect(request.openingBalance).toEqual({ amount: '0.00', currency: 'IRR' });
  });
});
