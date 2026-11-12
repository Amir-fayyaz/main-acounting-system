import type { PaginatedResponse } from '@repo/web';

import {
  type CreatePosTerminalRequest,
  type PosTerminal,
  type PosTerminalDto,
  type PosTerminalFieldErrors,
  type PosTerminalListParams,
} from '../assets/@types/pos-terminal.types';
import { createMockPosTerminalDtos } from '../assets/mock/pos-terminals.mock';
import { isFeeInRange, normalizeFeeInput } from '../utils/fee';
import { toAsciiDigits } from '../utils/format';
import { POS_STATUS_LABELS } from './pos.config';
import { PosApiError } from './pos-api.errors';
import { mapPosTerminalDtoToPosTerminal } from './pos-api.mapper';

export interface PosApi {
  /** فهرست صفحه‌بندی‌شده و فیلترشده‌ی ترمینال‌ها. */
  list(params?: PosTerminalListParams): Promise<PaginatedResponse<PosTerminal>>;
  /** ترمینال با شماره‌ی داده‌شده؛ برای جلوگیری از ثبت تکراری. */
  findByTerminalNumber(terminalNumber: string): Promise<PosTerminal | null>;
  create(payload: CreatePosTerminalRequest): Promise<PosTerminal>;
}

export interface PosApiOptions {
  /** تأخیر شبیه‌سازی‌شده برای حالت‌های بارگذاری؛ در تست‌ها صفر می‌شود. */
  latencyMs?: number;
  initialDtos?: PosTerminalDto[];
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DIGITS_ONLY = /^\d+$/;

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

function normalizeDigits(value: string): string {
  return toAsciiDigits(value).trim();
}

function normalizeSearchValue(value: string): string {
  return toAsciiDigits(value)
    .replace(/[٬,\s]/g, '')
    .replace(/٫/g, '.')
    .toLowerCase();
}

function matchesFilters(dto: PosTerminalDto, params: PosTerminalListParams): boolean {
  if (params.status && dto.status !== params.status) return false;

  const needle = normalizeSearchValue(params.search ?? '');
  if (!needle) return true;

  const haystack = normalizeSearchValue(
    [
      dto.title,
      dto.terminalNumber,
      dto.merchantNumber ?? '',
      dto.bank ?? '',
      dto.feePercent ?? '',
      dto.settlementIban ?? '',
      dto.activatedOn ?? '',
      POS_STATUS_LABELS[dto.status],
    ].join(' '),
  );

  return haystack.includes(needle);
}

function toEnvelope(
  dtos: readonly PosTerminalDto[],
  page: number | undefined,
  limit: number | undefined,
): PaginatedResponse<PosTerminal> {
  const safeLimit = clampPositiveInteger(limit, DEFAULT_LIMIT, MAX_LIMIT);
  const total = dtos.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);
  const safePage = Math.min(clampPositiveInteger(page, DEFAULT_PAGE), Math.max(totalPages, 1));
  const from = (safePage - 1) * safeLimit;

  return {
    data: dtos.slice(from, from + safeLimit).map(mapPosTerminalDtoToPosTerminal),
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

function findDuplicateTerminal(
  dtos: readonly PosTerminalDto[],
  terminalNumber: string,
): PosTerminalDto | null {
  const normalized = normalizeDigits(terminalNumber);

  return dtos.find((dto) => normalizeDigits(dto.terminalNumber) === normalized) ?? null;
}

function validatePayload(
  payload: CreatePosTerminalRequest,
  dtos: readonly PosTerminalDto[],
): { fieldErrors: PosTerminalFieldErrors; duplicate: PosTerminalDto | null } {
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
    fieldErrors.terminalNumber = 'ترمینالی با این شماره قبلاً ثبت شده است.';
  }

  return { fieldErrors, duplicate };
}

function throwValidationError(fieldErrors: PosTerminalFieldErrors): void {
  if (Object.keys(fieldErrors).length === 0) return;

  throw new PosApiError({
    code: 'VALIDATION',
    status: 422,
    message: 'اطلاعات ترمینال معتبر نیست؛ خطاهای فرم را بررسی کنید.',
    fieldErrors,
  });
}

/** کارخانه‌ی API شبیه‌سازی‌شده با حالت داخلی قابل تست. */
export function createPosApi(options: PosApiOptions = {}): PosApi {
  const latencyMs = options.latencyMs ?? 0;
  const dtos = (options.initialDtos ?? createMockPosTerminalDtos()).map((dto) => ({ ...dto }));
  let idSequence = dtos.length;

  const nextId = (): string => {
    let id = '';

    do {
      idSequence += 1;
      id = `pos-${String(1000 + idSequence).padStart(4, '0')}`;
    } while (dtos.some((dto) => dto.id === id));

    return id;
  };

  const list = async (
    params: PosTerminalListParams = {},
  ): Promise<PaginatedResponse<PosTerminal>> => {
    await delay(latencyMs);
    const filtered = dtos.filter((dto) => matchesFilters(dto, params));

    return toEnvelope(filtered, params.page, params.limit);
  };

  const findByTerminalNumber = async (terminalNumber: string): Promise<PosTerminal | null> => {
    await delay(latencyMs);
    const found = findDuplicateTerminal(dtos, terminalNumber);

    return found ? mapPosTerminalDtoToPosTerminal(found) : null;
  };

  const create = async (payload: CreatePosTerminalRequest): Promise<PosTerminal> => {
    await delay(latencyMs);
    const { fieldErrors, duplicate } = validatePayload(payload, dtos);

    if (duplicate) {
      throw new PosApiError({
        code: 'DUPLICATE_TERMINAL',
        status: 409,
        message: 'ترمینالی با این شماره قبلاً ثبت شده است.',
        fieldErrors: { terminalNumber: 'ترمینالی با این شماره قبلاً ثبت شده است.' },
      });
    }

    throwValidationError(fieldErrors);

    const dto: PosTerminalDto = {
      id: nextId(),
      revision: 1,
      title: payload.title.trim(),
      terminalNumber: normalizeDigits(payload.terminalNumber),
      merchantNumber: payload.merchantNumber ? normalizeDigits(payload.merchantNumber) : null,
      bank: payload.bank?.trim() || null,
      feePercent: payload.feePercent ? normalizeFeeInput(payload.feePercent) : null,
      settlementIban: null,
      activatedOn: null,
      status: 'active',
    };

    dtos.unshift(dto);

    return mapPosTerminalDtoToPosTerminal(dto);
  };

  return { list, findByTerminalNumber, create };
}

/** نمونه‌ی مشترک صفحه؛ تأخیر کوتاه برای دیده‌شدن حالت بارگذاری. */
export const posApi = createPosApi({ latencyMs: 250 });
