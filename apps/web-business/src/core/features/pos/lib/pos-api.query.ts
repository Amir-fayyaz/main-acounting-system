import type { PaginatedResponse } from '@repo/web';

import type {
  PosTerminal,
  PosTerminalDto,
  PosTerminalListParams,
} from '../assets/@types/pos-terminal.types';
import { toAsciiDigits } from '../utils/format';
import { POS_STATUS_LABELS } from './pos.config';
import { mapPosTerminalDtoListToPosTerminals } from './pos-api.mapper';

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

function normalizeSearchValue(value: string): string {
  return toAsciiDigits(value)
    .replace(/[٬,\s]/g, '')
    .replace(/٫/g, '.')
    .toLowerCase();
}

function matchesFilters(dto: PosTerminalDto, params: PosTerminalListParams): boolean {
  if (params.status && dto.status !== params.status) return false;

  const searchTerm = normalizeSearchValue(params.search ?? '');
  if (!searchTerm) return true;

  const searchableText = normalizeSearchValue(
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

  return searchableText.includes(searchTerm);
}

export function filterPosTerminalDtos(
  dtos: readonly PosTerminalDto[],
  params: PosTerminalListParams,
): PosTerminalDto[] {
  return dtos.filter((dto) => matchesFilters(dto, params));
}

export function toPosTerminalsPage(
  dtos: readonly PosTerminalDto[],
  page: number | undefined,
  limit: number | undefined,
): PaginatedResponse<PosTerminal> {
  const safeLimit = clampPositiveInteger(limit, DEFAULT_LIMIT, MAX_LIMIT);
  const total = dtos.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);
  const safePage = Math.min(
    clampPositiveInteger(page, DEFAULT_PAGE),
    Math.max(totalPages, 1),
  );
  const firstIndex = (safePage - 1) * safeLimit;

  return {
    data: mapPosTerminalDtoListToPosTerminals(dtos.slice(firstIndex, firstIndex + safeLimit)),
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}
