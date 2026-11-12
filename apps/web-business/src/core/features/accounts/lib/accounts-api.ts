import type { PaginatedResponse } from '@repo/web';

import {
  ACCOUNT_CURRENCY,
  type Account,
  type AccountDto,
  type AccountFieldErrors,
  type AccountListParams,
  type AccountStats,
  type AccountStatsParams,
  type AccountType,
  type CreateAccountRequest,
  isAccountType,
} from '../assets/@types/account.types';
import { createMockAccountDtos } from '../assets/mock/accounts.mock';
import { toAsciiDigits } from '../utils/format';
import { isCanonicalMoney, normalizeMoneyInput, sumMoney } from '../utils/money';
import {
  ACCOUNT_IBAN_PATTERN,
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_TYPE_LABELS,
} from './accounts.config';
import { AccountApiError } from './accounts-api.errors';
import { mapAccountDtoToAccount } from './accounts-api.mapper';

export interface AccountsApi {
  /** فهرست صفحه‌بندی‌شده و فیلترشده‌ی حساب‌ها. */
  list(params?: AccountListParams): Promise<PaginatedResponse<Account>>;
  /** آمار مجموعه‌ی فیلترشده، پیش از صفحه‌بندی. */
  stats(params?: AccountStatsParams): Promise<AccountStats>;
  create(payload: CreateAccountRequest): Promise<Account>;
}

export interface AccountsApiOptions {
  /** تأخیر شبیه‌سازی‌شده برای حالت‌های بارگذاری؛ در تست‌ها صفر می‌شود. */
  latencyMs?: number;
  initialDtos?: AccountDto[];
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

function normalizeDigits(value: string): string {
  return toAsciiDigits(value).trim();
}

function normalizeIban(value: string): string {
  return normalizeDigits(value).replace(/[\s-]/g, '').toUpperCase();
}

function matchesFilters(dto: AccountDto, params: AccountListParams): boolean {
  if (params.type && dto.type !== params.type) return false;

  const needle = normalizeDigits(params.search ?? '').toLowerCase();
  if (!needle) return true;

  const haystack = normalizeDigits(
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

  return haystack.includes(needle);
}

function toEnvelope(
  dtos: readonly AccountDto[],
  page: number | undefined,
  limit: number | undefined,
): PaginatedResponse<Account> {
  const safeLimit = clampPositiveInteger(limit, DEFAULT_LIMIT, MAX_LIMIT);
  const total = dtos.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);
  const safePage = Math.min(clampPositiveInteger(page, DEFAULT_PAGE), Math.max(totalPages, 1));
  const from = (safePage - 1) * safeLimit;

  return {
    data: dtos.slice(from, from + safeLimit).map(mapAccountDtoToAccount),
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

function validatePayload(payload: CreateAccountRequest): AccountFieldErrors {
  const fieldErrors: AccountFieldErrors = {};

  if (!payload.title.trim()) {
    fieldErrors.title = 'عنوان حساب را وارد کنید.';
  }

  if (!isAccountType(payload.type)) {
    fieldErrors.type = 'نوع حساب را انتخاب کنید.';
  }

  if (payload.type === 'bank') {
    if (!payload.bank?.trim()) {
      fieldErrors.bank = 'نام بانک را وارد کنید.';
    }

    const iban = normalizeIban(payload.iban ?? '');
    if (!iban) {
      fieldErrors.iban = 'شماره شبا را وارد کنید.';
    } else if (!ACCOUNT_IBAN_PATTERN.test(iban)) {
      fieldErrors.iban = 'شماره شبا باید با IR شروع شود و ۲۴ رقم داشته باشد.';
    }
  }

  if (!isCanonicalMoney(payload.openingBalance.amount)) {
    fieldErrors.openingBalance = 'موجودی اولیه را به شکل مبلغ معتبر وارد کنید.';
  }

  return fieldErrors;
}

function throwValidationError(fieldErrors: AccountFieldErrors): void {
  if (Object.keys(fieldErrors).length === 0) return;

  throw new AccountApiError({
    code: 'VALIDATION',
    status: 422,
    message: 'اطلاعات حساب معتبر نیست؛ خطاهای فرم را بررسی کنید.',
    fieldErrors,
  });
}

/** کارخانه‌ی API شبیه‌سازی‌شده با حالت داخلی قابل تست. */
export function createAccountsApi(options: AccountsApiOptions = {}): AccountsApi {
  const latencyMs = options.latencyMs ?? 0;
  const dtos = (options.initialDtos ?? createMockAccountDtos()).map((dto) => ({
    ...dto,
    balance: { ...dto.balance },
  }));
  let idSequence = dtos.length;

  const nextId = (): string => {
    let id = '';

    do {
      idSequence += 1;
      id = `account-${String(1000 + idSequence).padStart(4, '0')}`;
    } while (dtos.some((dto) => dto.id === id));

    return id;
  };

  const list = async (params: AccountListParams = {}): Promise<PaginatedResponse<Account>> => {
    await delay(latencyMs);
    const filtered = dtos.filter((dto) => matchesFilters(dto, params));

    return toEnvelope(filtered, params.page, params.limit);
  };

  const stats = async (params: AccountStatsParams = {}): Promise<AccountStats> => {
    await delay(latencyMs);
    const filtered = dtos.filter((dto) => matchesFilters(dto, params));
    const bankBalance = sumMoney(
      filtered.filter((dto) => dto.type === 'bank').map((dto) => dto.balance.amount),
    );
    const cashBalance = sumMoney(
      filtered.filter((dto) => dto.type !== 'bank').map((dto) => dto.balance.amount),
    );

    return {
      bankBalance: { amount: bankBalance, currency: ACCOUNT_CURRENCY },
      cashBalance: { amount: cashBalance, currency: ACCOUNT_CURRENCY },
      total: filtered.length,
    };
  };

  const create = async (payload: CreateAccountRequest): Promise<Account> => {
    await delay(latencyMs);
    const fieldErrors = validatePayload(payload);
    throwValidationError(fieldErrors);

    const type: AccountType = payload.type;
    const openingBalance =
      normalizeMoneyInput(payload.openingBalance.amount) ?? payload.openingBalance.amount;

    const dto: AccountDto = {
      id: nextId(),
      revision: 1,
      title: payload.title.trim(),
      type,
      bank: type === 'bank' ? (payload.bank?.trim() ?? null) : null,
      iban: type === 'bank' ? normalizeIban(payload.iban ?? '') : null,
      branch: null,
      balance: {
        amount: openingBalance,
        currency: ACCOUNT_CURRENCY,
      },
      status: 'active',
    };

    dtos.unshift(dto);

    return mapAccountDtoToAccount(dto);
  };

  return { list, stats, create };
}

/** نمونه‌ی مشترک صفحه؛ تأخیر کوتاه برای دیده‌شدن حالت بارگذاری. */
export const accountsApi = createAccountsApi({ latencyMs: 250 });
