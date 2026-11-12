import {
  ACCOUNT_CURRENCY,
  type AccountFormValues,
  type CreateAccountRequest,
} from '../assets/@types/account.types';
import { normalizeMoneyInput } from '../utils/money';

export function createEmptyAccountFormValues(): AccountFormValues {
  return {
    title: '',
    type: 'bank',
    bank: '',
    iban: '',
    openingBalance: '',
  };
}

/** فرم ایجاد را به payload استاندارد API تبدیل می‌کند؛ بانک/شبا برای غیربانکی خالی می‌شود. */
export function mapAccountFormValuesToCreateRequest(
  values: AccountFormValues,
): CreateAccountRequest {
  const isBank = values.type === 'bank';

  return {
    title: values.title.trim(),
    type: values.type,
    bank: isBank ? values.bank.trim() : null,
    iban: isBank ? values.iban.replace(/[\s-]/g, '').toUpperCase() : null,
    openingBalance: {
      amount: normalizeMoneyInput(values.openingBalance) ?? '0.00',
      currency: ACCOUNT_CURRENCY,
    },
  };
}
