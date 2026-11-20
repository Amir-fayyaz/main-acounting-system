import { toAsciiDigits } from '../../shared';
import type {
  CreatePosTerminalRequest,
  PosTerminalDto,
  PosTerminalFieldErrors,
} from '../assets/@types/pos-terminal.types';
import { isFeeInRange, normalizeFeeInput } from '../utils/fee';
import {
  DUPLICATE_TERMINAL_MESSAGE,
  findDuplicateTerminal,
} from './pos-terminal.conflicts';
import { PosApiError } from './pos-api.errors';

const DIGITS_ONLY = /^\d+$/;

export interface PosValidationResult {
  fieldErrors: PosTerminalFieldErrors;
  duplicate: PosTerminalDto | null;
}

function normalizeDigits(value: string): string {
  return toAsciiDigits(value).trim();
}

export function validatePosTerminalPayload(
  payload: CreatePosTerminalRequest,
  dtos: readonly PosTerminalDto[],
): PosValidationResult {
  const fieldErrors: PosTerminalFieldErrors = {};
  const terminalNumber = normalizeDigits(payload.terminalNumber);
  const merchantNumber = payload.merchantNumber ? normalizeDigits(payload.merchantNumber) : '';
  const feePercent = payload.feePercent ? normalizeFeeInput(payload.feePercent) : null;

  if (!payload.title.trim()) {
    fieldErrors.title = 'عنوان دستگاه را وارد کنید.';
  }

  if (!terminalNumber) {
    fieldErrors.terminalNumber = 'شماره ترمینال را وارد کنید.';
  } else if (!DIGITS_ONLY.test(terminalNumber)) {
    fieldErrors.terminalNumber = 'شماره ترمینال باید فقط رقم باشد.';
  }

  if (merchantNumber && !DIGITS_ONLY.test(merchantNumber)) {
    fieldErrors.merchantNumber = 'شماره پذیرنده باید فقط رقم باشد.';
  }

  if (payload.feePercent) {
    if (!feePercent || !isFeeInRange(feePercent)) {
      fieldErrors.feePercent = 'کارمزد باید عددی بین ۰ تا ۱۰۰ باشد.';
    }
  }

  const duplicate = terminalNumber ? findDuplicateTerminal(dtos, terminalNumber) : null;
  if (duplicate) {
    fieldErrors.terminalNumber = DUPLICATE_TERMINAL_MESSAGE;
  }

  return { fieldErrors, duplicate };
}

export function assertValidPosTerminalPayload(validation: PosValidationResult): void {
  if (validation.duplicate) {
    throw new PosApiError({
      code: 'DUPLICATE_TERMINAL',
      status: 409,
      message: DUPLICATE_TERMINAL_MESSAGE,
      fieldErrors: { terminalNumber: DUPLICATE_TERMINAL_MESSAGE },
    });
  }

  if (Object.keys(validation.fieldErrors).length === 0) return;

  throw new PosApiError({
    code: 'VALIDATION',
    status: 422,
    message: 'اطلاعات ترمینال معتبر نیست؛ خطاهای فرم را بررسی کنید.',
    fieldErrors: validation.fieldErrors,
  });
}
