import type { Account, AccountDto } from '../assets/@types/account.types';
import { toAsciiDigits } from '../utils/format';
import { normalizeMoneyInput } from '../utils/money';
import { AccountApiError } from './accounts-api.errors';

function normalizeIban(value: string): string {
  return toAsciiDigits(value).replace(/[\s-]/g, '').toUpperCase();
}

/**
 * DTO سرور را به مدل نمایش تبدیل و مبلغ/شبا را canonical می‌کند.
 * داده‌ی ناسازگار با قرارداد به خطای API تبدیل می‌شود تا در حالت error دیده شود.
 */
export function mapAccountDtoToAccount(dto: AccountDto): Account {
  const amount = normalizeMoneyInput(dto.balance.amount);

  if (!amount) {
    throw new AccountApiError({
      message: 'داده‌ی حساب از سرور با قرارداد پول سازگار نیست.',
      code: 'MALFORMED_RESPONSE',
      status: 500,
    });
  }

  return {
    id: dto.id,
    revision: dto.revision,
    title: dto.title.trim(),
    type: dto.type,
    bank: dto.bank?.trim() || null,
    iban: dto.iban ? normalizeIban(dto.iban) : null,
    branch: dto.branch?.trim() || null,
    balance: {
      amount,
      currency: dto.balance.currency,
    },
    status: dto.status,
  };
}

export function mapAccountDtoListToAccounts(dtos: readonly AccountDto[]): Account[] {
  return dtos.map(mapAccountDtoToAccount);
}
