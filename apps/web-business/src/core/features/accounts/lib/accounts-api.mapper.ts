import { normalizeIban, normalizeMoneyInput } from '../../shared';
import {
  ACCOUNT_CURRENCY,
  type Account,
  type AccountDto,
  type AccountType,
  type CreateAccountRequest,
} from '../assets/@types/account.types';
import { AccountApiError } from './accounts-api.errors';

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

export function mapCreateAccountRequestToDto(
  payload: CreateAccountRequest,
  id: string,
): AccountDto {
  const type: AccountType = payload.type;
  const openingBalance =
    normalizeMoneyInput(payload.openingBalance.amount) ?? payload.openingBalance.amount;

  return {
    id,
    revision: 1,
    title: payload.title.trim(),
    type,
    bank: type === 'bank' ? (payload.bank?.trim() ?? null) : null,
    iban: type === 'bank' ? normalizeIban(payload.iban ?? '') : null,
    branch: null,
    balance: {
      amount: openingBalance,
      currency: ACCOUNT_CURRENCY,
    },
    status: 'active',
  };
}

export function mapAccountDtoListToAccounts(dtos: readonly AccountDto[]): Account[] {
  return dtos.map(mapAccountDtoToAccount);
}
