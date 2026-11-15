import type { PaginatedResponse } from '@repo/web';

import type {
  Account,
  AccountDto,
  AccountListParams,
  AccountStats,
} from '../assets/@types/account.types';
import { ACCOUNT_CURRENCY } from '../assets/@types/account.types';
import { toAsciiDigits } from '../utils/format';
import { sumMoney } from '../utils/money';
import { ACCOUNT_STATUS_LABELS, ACCOUNT_TYPE_LABELS } from './accounts.config';
import { mapAccountDtoListToAccounts } from './accounts-api.mapper';

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

function matchesFilters(dto: AccountDto, params: AccountListParams): boolean {
  if (params.type && dto.type !== params.type) return false;

  const searchTerm = normalizeSearchText(params.search ?? '').toLowerCase();
  if (!searchTerm) return true;

  const searchableText = normalizeSearchText(
    [
      dto.title,
      dto.type,
      ACCOUNT_TYPE_LABELS[dto.type],
      dto.bank ?? '',
      dto.iban ?? '',
      dto.branch ?? '',
      ACCOUNT_STATUS_LABELS[dto.status],
      dto.balance.amount,
    ].join(' '),
  ).toLowerCase();

  return searchableText.includes(searchTerm);
}

export function filterAccountDtos(
  dtos: readonly AccountDto[],
  params: AccountListParams,
): AccountDto[] {
  return dtos.filter((dto) => matchesFilters(dto, params));
}

export function toAccountsPage(
  dtos: readonly AccountDto[],
  page: number | undefined,
  limit: number | undefined,
): PaginatedResponse<Account> {
  const safeLimit = clampPositiveInteger(limit, DEFAULT_LIMIT, MAX_LIMIT);
  const total = dtos.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);
  const safePage = Math.min(
    clampPositiveInteger(page, DEFAULT_PAGE),
    Math.max(totalPages, 1),
  );
  const firstIndex = (safePage - 1) * safeLimit;

  return {
    data: mapAccountDtoListToAccounts(dtos.slice(firstIndex, firstIndex + safeLimit)),
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

export function summarizeAccounts(dtos: readonly AccountDto[]): AccountStats {
  const bankAccounts = dtos.filter((dto) => dto.type === 'bank');
  const cashAccounts = dtos.filter((dto) => dto.type !== 'bank');

  return {
    bankBalance: {
      amount: sumMoney(bankAccounts.map((dto) => dto.balance.amount)),
      currency: ACCOUNT_CURRENCY,
    },
    cashBalance: {
      amount: sumMoney(cashAccounts.map((dto) => dto.balance.amount)),
      currency: ACCOUNT_CURRENCY,
    },
    total: dtos.length,
  };
}
