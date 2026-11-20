import type { PaginatedResponse } from '@repo/web';

import type {
  Cheque,
  ChequeConflict,
  ChequeConflictQuery,
  ChequeDto,
  ChequeFormRules,
  ChequeListParams,
  ChequeStats,
  ChequeStatsParams,
  CreateChequeRequest,
  UpdateChequeRequest,
} from '../assets/@types/cheque.types';
import { createMockChequeDtos, MOCK_CHEQUE_FORM_RULES } from '../assets/mock/checks.mock';
import {
  mapChequeDtoToCheque,
  mapCreateChequeRequestToDto,
  mapUpdateChequeRequestToDto,
} from './checks-api.mapper';
import {
  filterChequeDtos,
  summarizeCheques,
  toChequesPage,
} from './checks-api.query';
import { createChequeStore } from './checks-api.store';
import { assertChequeCanBeSaved, validateChequePayload } from './checks-api.validation';
import { findDuplicateCheques } from './cheque-conflicts';
import { ChequeApiError } from './checks-api.errors';

export interface ChecksApi {
  list(params?: ChequeListParams): Promise<PaginatedResponse<Cheque>>;
  stats(params?: ChequeStatsParams): Promise<ChequeStats>;
  getFormRules(): Promise<ChequeFormRules>;
  findConflict(query: ChequeConflictQuery): Promise<ChequeConflict>;
  create(payload: CreateChequeRequest): Promise<Cheque>;
  update(payload: UpdateChequeRequest): Promise<Cheque>;
}

export interface ChecksApiOptions {
  /** در تست‌ها صفر می‌شود تا پاسخ‌ها فوری باشند. */
  latencyMs?: number;
  initialDtos?: ChequeDto[];
  rules?: ChequeFormRules;
}

function waitForMockResponse(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();

  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function notFoundChequeError(): ChequeApiError {
  return new ChequeApiError({
    code: 'NOT_FOUND',
    status: 404,
    message: 'چک موردنظر پیدا نشد؛ ممکن است حذف شده باشد.',
  });
}

function staleRevisionError(): ChequeApiError {
  return new ChequeApiError({
    code: 'STALE_REVISION',
    status: 409,
    message:
      'این چک هم‌زمان توسط کاربر دیگری تغییر کرده است؛ فهرست را تازه کنید و دوباره تلاش کنید.',
  });
}

export function createChecksApi(options: ChecksApiOptions = {}): ChecksApi {
  const latencyMs = options.latencyMs ?? 0;
  const rules = options.rules ?? MOCK_CHEQUE_FORM_RULES;
  const store = createChequeStore(options.initialDtos ?? createMockChequeDtos());

  const list = async (params: ChequeListParams = {}): Promise<PaginatedResponse<Cheque>> => {
    await waitForMockResponse(latencyMs);
    const filteredDtos = filterChequeDtos(store.all(), params);

    return toChequesPage(filteredDtos, params.page, params.limit);
  };

  const stats = async (params: ChequeStatsParams = {}): Promise<ChequeStats> => {
    await waitForMockResponse(latencyMs);

    return summarizeCheques(filterChequeDtos(store.all(), params));
  };

  const getFormRules = async (): Promise<ChequeFormRules> => {
    await waitForMockResponse(latencyMs);

    return {
      sayad: { ...rules.sayad },
      chequeNumber: { ...rules.chequeNumber },
      duplicateNumberScope: rules.duplicateNumberScope,
    };
  };

  const findConflict = async (query: ChequeConflictQuery): Promise<ChequeConflict> => {
    await waitForMockResponse(latencyMs);
    const duplicates = findDuplicateCheques(store.all(), query, rules.duplicateNumberScope);

    return {
      number: duplicates.number ? mapChequeDtoToCheque(duplicates.number) : null,
      sayadId: duplicates.sayadId ? mapChequeDtoToCheque(duplicates.sayadId) : null,
    };
  };

  const create = async (payload: CreateChequeRequest): Promise<Cheque> => {
    await waitForMockResponse(latencyMs);
    const validation = validateChequePayload(payload, rules, store.all());
    assertChequeCanBeSaved(validation, rules.duplicateNumberScope);

    const dto = mapCreateChequeRequestToDto(payload, store.nextId());
    store.prepend(dto);

    return mapChequeDtoToCheque(dto);
  };

  const update = async (payload: UpdateChequeRequest): Promise<Cheque> => {
    await waitForMockResponse(latencyMs);
    const current = store.findById(payload.id);

    if (!current) throw notFoundChequeError();
    if (payload.expectedRevision !== current.revision) throw staleRevisionError();

    const validation = validateChequePayload(payload, rules, store.all(), payload.id);
    assertChequeCanBeSaved(validation, rules.duplicateNumberScope);

    const updated = mapUpdateChequeRequestToDto(payload, current);
    store.replace(payload.id, updated);

    return mapChequeDtoToCheque(updated);
  };

  return { list, stats, getFormRules, findConflict, create, update };
}

export const checksApi = createChecksApi({ latencyMs: 250 });
