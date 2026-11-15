import type { AccountFormErrors } from '../assets/@types/account.types';

export type AccountApiErrorCode = 'VALIDATION' | 'MALFORMED_RESPONSE' | 'UNKNOWN';

interface AccountApiErrorInit {
  message: string;
  code: AccountApiErrorCode;
  status: number;
  fieldErrors?: AccountFormErrors;
}

/** خطای لایه‌ی API با کد و خطاهای فیلد قابل نمایش در فرم. */
export class AccountApiError extends Error {
  readonly code: AccountApiErrorCode;

  readonly status: number;

  readonly fieldErrors?: AccountFormErrors;

  constructor({ message, code, status, fieldErrors }: AccountApiErrorInit) {
    super(message);
    this.name = 'AccountApiError';
    this.code = code;
    this.status = status;
    if (fieldErrors) this.fieldErrors = fieldErrors;
    Object.setPrototypeOf(this, AccountApiError.prototype);
  }
}

export function isAccountApiError(value: unknown): value is AccountApiError {
  return value instanceof AccountApiError;
}

export function resolveAccountErrorMessage(
  error: unknown,
  fallback = 'درخواست با مشکل مواجه شد. لطفاً دوباره تلاش کنید.',
): string {
  return isAccountApiError(error) ? error.message : fallback;
}
