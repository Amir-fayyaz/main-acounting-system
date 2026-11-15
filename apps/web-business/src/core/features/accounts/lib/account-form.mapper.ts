import { normalizeIban, normalizeMoneyInput } from '../../shared';
import {
  ACCOUNT_CURRENCY,
  type AccountFormValues,
  type CreateAccountRequest,
} from '../assets/@types/account.types';

export function createEmptyAccountFormValues(): AccountFormValues {
  return {
    title: '',
    type: 'bank',
    bank: '',
    iban: '',
    openingBalance: '',
  };
}

export function mapAccountFormValuesToCreateRequest(
  values: AccountFormValues,
): CreateAccountRequest {
  const isBank = values.type === 'bank';

  return {
    title: values.title.trim(),
    type: values.type,
    bank: isBank ? values.bank.trim() : null,
    iban: isBank ? normalizeIban(values.iban) : null,
    openingBalance: {
      amount: normalizeMoneyInput(values.openingBalance) ?? '0.00',
      currency: ACCOUNT_CURRENCY,
    },
  };
}
