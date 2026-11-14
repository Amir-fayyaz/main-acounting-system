import type { PosTerminalFieldErrors } from '../assets/@types/pos-terminal.types';

export type PosApiErrorCode =
  'DUPLICATE_TERMINAL' | 'VALIDATION' | 'MALFORMED_RESPONSE' | 'UNKNOWN';

interface PosApiErrorInit {
  message: string;
  code: PosApiErrorCode;
  status: number;
  fieldErrors?: PosTerminalFieldErrors;
}

/** خطای لایه‌ی API با کد و خطاهای فیلد قابل نمایش در فرم. */
export class PosApiError extends Error {
  readonly code: PosApiErrorCode;

  readonly status: number;

  readonly fieldErrors?: PosTerminalFieldErrors;

  constructor({ message, code, status, fieldErrors }: PosApiErrorInit) {
    super(message);
    this.name = 'PosApiError';
    this.code = code;
    this.status = status;
    if (fieldErrors) this.fieldErrors = fieldErrors;
    Object.setPrototypeOf(this, PosApiError.prototype);
  }
}

export function isPosApiError(value: unknown): value is PosApiError {
  return value instanceof PosApiError;
}

export function resolvePosErrorMessage(
  error: unknown,
  fallback = 'درخواست با مشکل مواجه شد. لطفاً دوباره تلاش کنید.',
): string {
  return isPosApiError(error) ? error.message : fallback;
}
