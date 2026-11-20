import type { PaginatedResponse } from '@repo/web';
import { toAsciiDigits } from '../../shared';
import type {
  Cheque,
  ChequeDto,
  ChequeListParams,
  ChequeStats,
} from '../assets/@types/cheque.types';
import { CHEQUE_DIRECTION_LABELS, CHEQUE_STATUS_LABELS } from './checks.config';
import { mapChequeDtoListToCheques } from './checks-api.mapper';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function clampPositiveInteger(
  value: number | undefined,
  fallback: number,
  max?: number,
): number {
  if (value === undefined || !Number.isFinite(value) || value < 1) return fallback;

  const integer = Math.floor(value);

  return max === undefined ? integer : Math.min(integer, max);
}

function normalizeSearchText(value: string): string {
  return toAsciiDigits(value).trim();
}

function matchesFilters(dto: ChequeDto, params: ChequeListParams): boolean {
  if (params.status && dto.status !== params.status) return false;
  if (params.direction && dto.direction !== params.direction) return false;

  const searchTerm = normalizeSearchText(params.search ?? '').toLowerCase();
  if (!searchTerm) return true;

  const searchableText = normalizeSearchText(
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

  return searchableText.includes(searchTerm);
}

export function filterChequeDtos(
  dtos: readonly ChequeDto[],
  params: ChequeListParams,
): ChequeDto[] {
  return dtos.filter((dto) => matchesFilters(dto, params));
}

export function toChequesPage(
  dtos: readonly ChequeDto[],
  page: number | undefined,
  limit: number | undefined,
): PaginatedResponse<Cheque> {
  const safeLimit = clampPositiveInteger(limit, DEFAULT_LIMIT, MAX_LIMIT);
  const total = dtos.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);
  const safePage = Math.min(
    clampPositiveInteger(page, DEFAULT_PAGE),
    Math.max(totalPages, 1),
  );
  const firstIndex = (safePage - 1) * safeLimit;

  return {
    data: mapChequeDtoListToCheques(dtos.slice(firstIndex, firstIndex + safeLimit)),
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

export function summarizeCheques(dtos: readonly ChequeDto[]): ChequeStats {
  return {
    total: dtos.length,
    received: dtos.filter((dto) => dto.direction === 'received').length,
    issued: dtos.filter((dto) => dto.direction === 'issued').length,
    overdue: dtos.filter((dto) => dto.status === 'overdue').length,
  };
}
