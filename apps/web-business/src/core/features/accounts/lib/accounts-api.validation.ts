import type {
  AccountFieldErrors,
  CreateAccountRequest,
} from '../assets/@types/account.types';
import { isAccountType } from '../assets/@types/account.types';
import { normalizeIban } from '../utils/iban';
import { isCanonicalMoney } from '../utils/money';
import { ACCOUNT_IBAN_PATTERN } from './accounts.config';
import { AccountApiError } from './accounts-api.errors';

export function validateCreateAccountPayload(
  payload: CreateAccountRequest,
): AccountFieldErrors {
  const fieldErrors: AccountFieldErrors = {};

  if (!payload.title.trim()) {
    fieldErrors.title = 'عنوان حساب را وارد کنید.';
  }

  if (!isAccountType(payload.type)) {
    fieldErrors.type = 'نوع حساب را انتخاب کنید.';
  }

  if (payload.type === 'bank') {
    if (!payload.bank?.trim()) {
      fieldErrors.bank = 'نام بانک را وارد کنید.';
    }

    const iban = normalizeIban(payload.iban ?? '');

    if (!iban) {
      fieldErrors.iban = 'شماره شبا را وارد کنید.';
    } else if (!ACCOUNT_IBAN_PATTERN.test(iban)) {
      fieldErrors.iban = 'شماره شبا باید با IR شروع شود و ۲۴ رقم داشته باشد.';
    }
  }

  if (!isCanonicalMoney(payload.openingBalance.amount)) {
    fieldErrors.openingBalance = 'موجودی اولیه را به شکل مبلغ معتبر وارد کنید.';
  }

  return fieldErrors;
}

export function assertValidCreateAccountPayload(payload: CreateAccountRequest): void {
  const fieldErrors = validateCreateAccountPayload(payload);
  if (Object.keys(fieldErrors).length === 0) return;

  throw new AccountApiError({
    code: 'VALIDATION',
    status: 422,
    message: 'اطلاعات حساب معتبر نیست؛ خطاهای فرم را بررسی کنید.',
    fieldErrors,
  });
}
