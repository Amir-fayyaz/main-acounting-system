import type { ChequeFieldErrors } from '../assets/@types/cheque.types';

export type ChequeApiErrorCode =
  | 'DUPLICATE_NUMBER'
  | 'DUPLICATE_SAYAD'
  | 'STALE_REVISION'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'MALFORMED_RESPONSE'
  | 'UNKNOWN';

interface ChequeApiErrorInit {
  message: string;
  code: ChequeApiErrorCode;
  status: number;
  fieldErrors?: ChequeFieldErrors;
}

/** خطای لایه‌ی API با کد و خطاهای فیلد قابل نمایش در فرم. */
export class ChequeApiError extends Error {
  readonly code: ChequeApiErrorCode;

  readonly status: number;

  readonly fieldErrors?: ChequeFieldErrors;

  constructor({ message, code, status, fieldErrors }: ChequeApiErrorInit) {
    super(message);
    this.name = 'ChequeApiError';
    this.code = code;
    this.status = status;
    if (fieldErrors) this.fieldErrors = fieldErrors;
    Object.setPrototypeOf(this, ChequeApiError.prototype);
  }
}

export function isChequeApiError(value: unknown): value is ChequeApiError {
  return value instanceof ChequeApiError;
}

export function resolveChequeErrorMessage(
  error: unknown,
  fallback = 'درخواست با مشکل مواجه شد. لطفاً دوباره تلاش کنید.',
): string {
  return isChequeApiError(error) ? error.message : fallback;
}
