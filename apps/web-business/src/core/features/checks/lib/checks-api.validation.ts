import type {
  ChequeDto,
  ChequeFieldErrors,
  ChequeFormRules,
  CreateChequeRequest,
} from '../assets/@types/cheque.types';
import { isChequeDirection } from '../assets/@types/cheque.types';
import { toAsciiDigits, toPersianDigits } from '../utils/format';
import { normalizeJalaliDate } from '../utils/jalali';
import { isPositiveMoney } from '../utils/money';
import {
  DUPLICATE_SAYAD_MESSAGE,
  duplicateNumberMessage,
  findDuplicateCheques,
} from './cheque-conflicts';
import { ChequeApiError } from './checks-api.errors';

export interface ChequeValidationResult {
  fieldErrors: ChequeFieldErrors;
  duplicateNumber: ChequeDto | null;
  duplicateSayad: ChequeDto | null;
}

function normalizeDigits(value: string): string {
  return toAsciiDigits(value).trim();
}

export function validateChequePayload(
  payload: CreateChequeRequest,
  rules: ChequeFormRules,
  dtos: readonly ChequeDto[],
  excludeId?: string,
): ChequeValidationResult {
  const fieldErrors: ChequeFieldErrors = {};
  const number = normalizeDigits(payload.number);
  const sayadId = normalizeDigits(payload.sayadId);
  const registeredDate = normalizeJalaliDate(payload.registeredDate);
  const dueDate = normalizeJalaliDate(payload.dueDate);

  if (!new RegExp(rules.chequeNumber.pattern).test(number)) {
    fieldErrors.number = `شماره چک باید بین ${toPersianDigits(
      rules.chequeNumber.minLength,
    )} تا ${toPersianDigits(rules.chequeNumber.maxLength)} رقم باشد.`;
  }

  if (!new RegExp(rules.sayad.pattern).test(sayadId)) {
    fieldErrors.sayadId = `شناسه صیادی باید ${toPersianDigits(rules.sayad.length)} رقم باشد.`;
  }

  if (!isChequeDirection(payload.direction)) {
    fieldErrors.direction = 'نوع چک را انتخاب کنید.';
  }

  if (!payload.counterparty.trim()) fieldErrors.counterparty = 'طرف حساب را وارد کنید.';
  if (!payload.bank.trim()) fieldErrors.bank = 'بانک را وارد کنید.';
  if (!isPositiveMoney(payload.amount.amount)) fieldErrors.amount = 'مبلغ چک را وارد کنید.';
  if (!registeredDate) fieldErrors.registeredDate = 'تاریخ ثبت را شمسی و معتبر وارد کنید.';
  if (!dueDate) fieldErrors.dueDate = 'تاریخ سررسید را شمسی و معتبر وارد کنید.';
  if (registeredDate && dueDate && dueDate < registeredDate) {
    fieldErrors.dueDate = 'تاریخ سررسید نمی‌تواند قبل از تاریخ ثبت باشد.';
  }

  const duplicates = findDuplicateCheques(
    dtos,
    {
      number,
      bank: payload.bank,
      sayadId,
      ...(excludeId ? { excludeId } : {}),
    },
    rules.duplicateNumberScope,
  );

  if (duplicates.number) {
    fieldErrors.number = duplicateNumberMessage(rules.duplicateNumberScope);
  }
  if (duplicates.sayadId) {
    fieldErrors.sayadId = DUPLICATE_SAYAD_MESSAGE;
  }

  return {
    fieldErrors,
    duplicateNumber: duplicates.number,
    duplicateSayad: duplicates.sayadId,
  };
}

export function assertChequeCanBeSaved(
  validation: ChequeValidationResult,
  scope: ChequeFormRules['duplicateNumberScope'],
): void {
  if (validation.duplicateNumber) {
    throw new ChequeApiError({
      code: 'DUPLICATE_NUMBER',
      status: 409,
      message: duplicateNumberMessage(scope),
      fieldErrors: validation.fieldErrors,
    });
  }

  if (validation.duplicateSayad) {
    throw new ChequeApiError({
      code: 'DUPLICATE_SAYAD',
      status: 409,
      message: DUPLICATE_SAYAD_MESSAGE,
      fieldErrors: validation.fieldErrors,
    });
  }

  if (Object.keys(validation.fieldErrors).length === 0) return;

  throw new ChequeApiError({
    code: 'VALIDATION',
    status: 422,
    message: 'اطلاعات چک معتبر نیست؛ خطاهای فرم را بررسی کنید.',
    fieldErrors: validation.fieldErrors,
  });
}
