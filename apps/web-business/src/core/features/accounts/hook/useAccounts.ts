'use client';

import type { PaginatedResponse } from '@repo/web';
import { useCallback, useEffect, useState } from 'react';

import type { Account, AccountListParams, AccountStats } from '../assets/@types/account.types';
import { accountsApi } from '../lib/accounts-api';
import { resolveAccountErrorMessage } from '../lib/accounts-api.errors';

export type UseAccountsParams = Pick<AccountListParams, 'page' | 'limit' | 'search' | 'type'>;

export type UseAccountsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'success';
      response: PaginatedResponse<Account>;
      stats: AccountStats;
    };

export interface UseAccountsResult {
  state: UseAccountsState;
  /** دریافت دوباره‌ی فهرست و آمار با همان پارامترهای فعلی. */
  refresh: () => void;
}

const FALLBACK_ERROR = 'دریافت فهرست حساب‌ها با مشکل مواجه شد. لطفاً دوباره تلاش کنید.';

/** فهرست + آمار حساب‌ها را برای پارامترهای فعلی URL دریافت می‌کند. */
export function useAccounts(params: UseAccountsParams): UseAccountsResult {
  const { page = 1, limit = 20, search = '', type } = params;
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    state: UseAccountsState;
  } | null>(null);

  const key = JSON.stringify({
    page,
    limit,
    search,
    type: type ?? null,
    version,
  });

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      accountsApi.list({
        page,
        limit,
        ...(search ? { search } : {}),
        ...(type ? { type } : {}),
      }),
      accountsApi.stats({
        ...(search ? { search } : {}),
        ...(type ? { type } : {}),
      }),
    ])
      .then(([response, stats]) => {
        if (isMounted) {
          setResult({ key, state: { status: 'success', response, stats } });
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setResult({
            key,
            state: {
              status: 'error',
              message: resolveAccountErrorMessage(error, FALLBACK_ERROR),
            },
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [key, limit, page, search, type]);

  const state: UseAccountsState =
    result !== null && result.key === key ? result.state : { status: 'loading' };

  const refresh = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);

  return { state, refresh };
}
