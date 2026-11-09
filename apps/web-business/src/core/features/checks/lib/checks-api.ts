import type { PaginatedResponse } from '@repo/web';

import {
  CHEQUE_CURRENCY,
  type Cheque,
  type ChequeConflict,
  type ChequeConflictQuery,
  type ChequeDto,
  type ChequeFieldErrors,
  type ChequeFormRules,
  type ChequeListParams,
  type ChequeStats,
  type ChequeStatsParams,
  type CreateChequeRequest,
  type UpdateChequeRequest,
  isChequeDirection,
} from '../assets/@types/cheque.types';
import { createMockChequeDtos, MOCK_CHEQUE_FORM_RULES } from '../assets/mock/checks.mock';
import { toAsciiDigits, toPersianDigits } from '../utils/format';
import { normalizeJalaliDate } from '../utils/jalali';
import { isPositiveMoney } from '../utils/money';
import { CHEQUE_DIRECTION_LABELS, CHEQUE_STATUS_LABELS } from './checks.config';
import { ChequeApiError } from './checks-api.errors';
import { mapChequeDtoToCheque } from './checks-api.mapper';

export interface ChecksApi {
  /** فهرست صفحه‌بندی‌شده و فیلترشده‌ی چک‌ها. */
  list(params?: ChequeListParams): Promise<PaginatedResponse<Cheque>>;
  /** آمار مجموعه‌ی فیلترشده، پیش از صفحه‌بندی. */
  stats(params?: ChequeStatsParams): Promise<ChequeStats>;
  /** قواعد فرم را API اعلام می‌کند؛ UI فقط آن‌ها را نمایش می‌دهد. */
  getFormRules(): Promise<ChequeFormRules>;
  /** بررسی تکرار شماره/شناسه صیادی برای UX فرم؛ مرجع نهایی سرور است. */
  findConflict(query: ChequeConflictQuery): Promise<ChequeConflict>;
  create(payload: CreateChequeRequest): Promise<Cheque>;
  /** در صورت تداخل نسخه، خطای 409 با کد STALE_REVISION برمی‌گرداند. */
  update(payload: UpdateChequeRequest): Promise<Cheque>;
}

export interface ChecksApiOptions {
  /** تأخیر شبیه‌سازی‌شده برای حالت‌های بارگذاری؛ در تست‌ها صفر می‌شود. */
  latencyMs?: number;
  initialDtos?: ChequeDto[];
  rules?: ChequeFormRules;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();

  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function clampPositiveInteger(value: number | undefined, fallback: number, max?: number): number {
  if (value === undefined || !Number.isFinite(value) || value < 1) return fallback;
  const integer = Math.floor(value);

  return max === undefined ? integer : Math.min(integer, max);
}

function normalizeNumber(value: string): string {
  return toAsciiDigits(value).trim();
}

function matchesFilters(dto: ChequeDto, params: ChequeListParams): boolean {
  if (params.status && dto.status !== params.status) return false;
  if (params.direction && dto.direction !== params.direction) return false;

  const needle = normalizeNumber(params.search ?? '').toLowerCase();
  if (!needle) return true;

  const haystack = normalizeNumber(
    [
      dto.number,
      dto.sayadId,
      dto.counterparty,
      dto.bank,
      CHEQUE_DIRECTION_LABELS[dto.direction],
      CHEQUE_STATUS_LABELS[dto.status],
      dto.registeredDate,
      dto.dueDate,
      dto.amount.amount,
    ].join(' '),
  ).toLowerCase();

  return haystack.includes(needle);
}

function toEnvelope(
  dtos: readonly ChequeDto[],
  page: number | undefined,
  limit: number | undefined,
): PaginatedResponse<Cheque> {
  const safeLimit = clampPositiveInteger(limit, DEFAULT_LIMIT, MAX_LIMIT);
  const total = dtos.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);
  const safePage = Math.min(clampPositiveInteger(page, DEFAULT_PAGE), Math.max(totalPages, 1));
  const from = (safePage - 1) * safeLimit;

  return {
    data: dtos.slice(from, from + safeLimit).map(mapChequeDtoToCheque),
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

function duplicateNumberMessage(scope: ChequeFormRules['duplicateNumberScope']): string {
  return scope === 'global'
    ? 'چکی با این شماره قبلاً ثبت شده است.'
    : 'چکی با این شماره برای همین بانک قبلاً ثبت شده است.';
}

function findDuplicates(
  dtos: readonly ChequeDto[],
  input: { number: string; bank: string; sayadId: string; excludeId?: string },
  scope: ChequeFormRules['duplicateNumberScope'] = 'bank',
): { number: ChequeDto | null; sayadId: ChequeDto | null } {
  const number = normalizeNumber(input.number);
  const sayadId = normalizeNumber(input.sayadId);
  const bank = input.bank.trim();
  const candidates = input.excludeId ? dtos.filter((dto) => dto.id !== input.excludeId) : [...dtos];
  const numberMatch =
    number && (scope === 'global' || bank)
      ? (candidates.find(
          (dto) =>
            normalizeNumber(dto.number) === number &&
            (scope === 'global' || dto.bank.trim() === bank),
        ) ?? null)
      : null;
  const sayadMatch = sayadId
    ? (candidates.find((dto) => normalizeNumber(dto.sayadId) === sayadId) ?? null)
    : null;

  return { number: numberMatch, sayadId: sayadMatch };
}

function validatePayload(
  payload: CreateChequeRequest,
  rules: ChequeFormRules,
  dtos: readonly ChequeDto[],
  excludeId?: string,
): {
  fieldErrors: ChequeFieldErrors;
  duplicateNumber: ChequeDto | null;
  duplicateSayad: ChequeDto | null;
} {
  const fieldErrors: ChequeFieldErrors = {};
  const number = normalizeNumber(payload.number);
  const sayadId = normalizeNumber(payload.sayadId);
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

  const duplicates = findDuplicates(
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
    fieldErrors.sayadId = 'این شناسه صیادی قبلاً ثبت شده است.';
  }

  return {
    fieldErrors,
    duplicateNumber: duplicates.number,
    duplicateSayad: duplicates.sayadId,
  };
}

function throwConflictError(
  duplicateNumber: ChequeDto | null,
  duplicateSayad: ChequeDto | null,
  fieldErrors: ChequeFieldErrors,
  scope: ChequeFormRules['duplicateNumberScope'],
): void {
  if (duplicateNumber) {
    throw new ChequeApiError({
      code: 'DUPLICATE_NUMBER',
      status: 409,
      message: duplicateNumberMessage(scope),
      fieldErrors,
    });
  }

  if (duplicateSayad) {
    throw new ChequeApiError({
      code: 'DUPLICATE_SAYAD',
      status: 409,
      message: 'این شناسه صیادی قبلاً ثبت شده است.',
      fieldErrors,
    });
  }
}

function throwValidationError(fieldErrors: ChequeFieldErrors): void {
  if (Object.keys(fieldErrors).length === 0) return;

  throw new ChequeApiError({
    code: 'VALIDATION',
    status: 422,
    message: 'اطلاعات چک معتبر نیست؛ خطاهای فرم را بررسی کنید.',
    fieldErrors,
  });
}

/** کارخانه‌ی API شبیه‌سازی‌شده با حالت داخلی قابل تست. */
export function createChecksApi(options: ChecksApiOptions = {}): ChecksApi {
  const latencyMs = options.latencyMs ?? 0;
  const rules = options.rules ?? MOCK_CHEQUE_FORM_RULES;
  const dtos = (options.initialDtos ?? createMockChequeDtos()).map((dto) => ({
    ...dto,
    amount: { ...dto.amount },
  }));
  let idSequence = dtos.length;

  const nextId = (): string => {
    let id = '';

    do {
      idSequence += 1;
      id = `cheque-${String(1000 + idSequence).padStart(4, '0')}`;
    } while (dtos.some((dto) => dto.id === id));

    return id;
  };

  const list = async (params: ChequeListParams = {}): Promise<PaginatedResponse<Cheque>> => {
    await delay(latencyMs);
    const filtered = dtos.filter((dto) => matchesFilters(dto, params));

    return toEnvelope(filtered, params.page, params.limit);
  };

  const stats = async (params: ChequeStatsParams = {}): Promise<ChequeStats> => {
    await delay(latencyMs);
    const filtered = dtos.filter((dto) => matchesFilters(dto, params));

    return {
      total: filtered.length,
      received: filtered.filter((dto) => dto.direction === 'received').length,
      issued: filtered.filter((dto) => dto.direction === 'issued').length,
      overdue: filtered.filter((dto) => dto.status === 'overdue').length,
    };
  };

  const getFormRules = async (): Promise<ChequeFormRules> => {
    await delay(latencyMs);

    return {
      sayad: { ...rules.sayad },
      chequeNumber: { ...rules.chequeNumber },
      duplicateNumberScope: rules.duplicateNumberScope,
    };
  };

  const findConflict = async (query: ChequeConflictQuery): Promise<ChequeConflict> => {
    await delay(latencyMs);
    const duplicates = findDuplicates(dtos, query, rules.duplicateNumberScope);

    return {
      number: duplicates.number ? mapChequeDtoToCheque(duplicates.number) : null,
      sayadId: duplicates.sayadId ? mapChequeDtoToCheque(duplicates.sayadId) : null,
    };
  };

  const create = async (payload: CreateChequeRequest): Promise<Cheque> => {
    await delay(latencyMs);
    const { fieldErrors, duplicateNumber, duplicateSayad } = validatePayload(payload, rules, dtos);
    throwConflictError(duplicateNumber, duplicateSayad, fieldErrors, rules.duplicateNumberScope);
    throwValidationError(fieldErrors);

    const registeredDate = normalizeJalaliDate(payload.registeredDate) ?? '';
    const dueDate = normalizeJalaliDate(payload.dueDate) ?? '';
    if (!registeredDate || !dueDate) throwValidationError(fieldErrors);

    const dto: ChequeDto = {
      id: nextId(),
      revision: 1,
      number: normalizeNumber(payload.number),
      sayadId: normalizeNumber(payload.sayadId),
      direction: payload.direction,
      counterparty: payload.counterparty.trim(),
      bank: payload.bank.trim(),
      amount: {
        amount: payload.amount.amount,
        currency: CHEQUE_CURRENCY,
      },
      registeredDate,
      dueDate,
      status: 'pending',
    };

    dtos.unshift(dto);

    return mapChequeDtoToCheque(dto);
  };

  const update = async (payload: UpdateChequeRequest): Promise<Cheque> => {
    await delay(latencyMs);
    const index = dtos.findIndex((dto) => dto.id === payload.id);

    if (index < 0) {
      throw new ChequeApiError({
        code: 'NOT_FOUND',
        status: 404,
        message: 'چک موردنظر پیدا نشد؛ ممکن است حذف شده باشد.',
      });
    }

    const current = dtos[index];
    if (!current) {
      throw new ChequeApiError({
        code: 'NOT_FOUND',
        status: 404,
        message: 'چک موردنظر پیدا نشد؛ ممکن است حذف شده باشد.',
      });
    }

    if (payload.expectedRevision !== current.revision) {
      throw new ChequeApiError({
        code: 'STALE_REVISION',
        status: 409,
        message:
          'این چک هم‌زمان توسط کاربر دیگری تغییر کرده است؛ فهرست را تازه کنید و دوباره تلاش کنید.',
      });
    }

    const { fieldErrors, duplicateNumber, duplicateSayad } = validatePayload(
      payload,
      rules,
      dtos,
      payload.id,
    );
    throwConflictError(duplicateNumber, duplicateSayad, fieldErrors, rules.duplicateNumberScope);
    throwValidationError(fieldErrors);

    const registeredDate = normalizeJalaliDate(payload.registeredDate) ?? '';
    const dueDate = normalizeJalaliDate(payload.dueDate) ?? '';
    if (!registeredDate || !dueDate) throwValidationError(fieldErrors);

    const updated: ChequeDto = {
      ...current,
      revision: current.revision + 1,
      number: normalizeNumber(payload.number),
      sayadId: normalizeNumber(payload.sayadId),
      direction: payload.direction,
      counterparty: payload.counterparty.trim(),
      bank: payload.bank.trim(),
      amount: {
        amount: payload.amount.amount,
        currency: CHEQUE_CURRENCY,
      },
      registeredDate,
      dueDate,
    };

    dtos[index] = updated;

    return mapChequeDtoToCheque(updated);
  };

  return { list, stats, getFormRules, findConflict, create, update };
}

/** نمونه‌ی مشترک صفحه؛ تأخیر کوتاه برای دیده‌شدن حالت بارگذاری. */
export const checksApi = createChecksApi({ latencyMs: 250 });
