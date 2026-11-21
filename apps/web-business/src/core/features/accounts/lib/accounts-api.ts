import type { PaginatedResponse } from '@repo/web';

import type {
  Account,
  AccountDto,
  AccountListParams,
  AccountStats,
  AccountStatsParams,
  CreateAccountRequest,
} from '../assets/@types/account.types';
import { createMockAccountDtos } from '../assets/mock/accounts.mock';
import { mapAccountDtoToAccount, mapCreateAccountRequestToDto } from './accounts-api.mapper';
import {
  filterAccountDtos,
  summarizeAccounts,
  toAccountsPage,
} from './accounts-api.query';
import { createAccountStore } from './accounts-api.store';
import { assertValidCreateAccountPayload } from './accounts-api.validation';

export interface AccountsApi {
  list(params?: AccountListParams): Promise<PaginatedResponse<Account>>;
  stats(params?: AccountStatsParams): Promise<AccountStats>;
  create(payload: CreateAccountRequest): Promise<Account>;
}

export interface AccountsApiOptions {
  /** در تست‌ها صفر می‌شود تا پاسخ‌ها فوری باشند. */
  latencyMs?: number;
  initialDtos?: AccountDto[];
}

function waitForMockResponse(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();

  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function createAccountsApi(options: AccountsApiOptions = {}): AccountsApi {
  const latencyMs = options.latencyMs ?? 0;
  const store = createAccountStore(options.initialDtos ?? createMockAccountDtos());

  const list = async (params: AccountListParams = {}): Promise<PaginatedResponse<Account>> => {
    await waitForMockResponse(latencyMs);
    const filteredDtos = filterAccountDtos(store.all(), params);

    return toAccountsPage(filteredDtos, params.page, params.limit);
  };

  const stats = async (params: AccountStatsParams = {}): Promise<AccountStats> => {
    await waitForMockResponse(latencyMs);
    const filteredDtos = filterAccountDtos(store.all(), params);

    return summarizeAccounts(filteredDtos);
  };

  const create = async (payload: CreateAccountRequest): Promise<Account> => {
    await waitForMockResponse(latencyMs);
    assertValidCreateAccountPayload(payload);

    const dto = mapCreateAccountRequestToDto(payload, store.nextId());
    store.prepend(dto);

    return mapAccountDtoToAccount(dto);
  };

  return { list, stats, create };
}

export const accountsApi = createAccountsApi({ latencyMs: 250 });
