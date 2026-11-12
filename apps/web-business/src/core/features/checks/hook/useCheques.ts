'use client';

import type { PaginatedResponse } from '@repo/web';
import { useCallback, useEffect, useState } from 'react';

import type { Cheque, ChequeListParams, ChequeStats } from '../assets/@types/cheque.types';
import { checksApi } from '../lib/checks-api';
import { resolveChequeErrorMessage } from '../lib/checks-api.errors';

export type UseChequesParams = Pick<
  ChequeListParams,
  'page' | 'limit' | 'search' | 'status' | 'direction'
>;

export type UseChequesState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'success';
      response: PaginatedResponse<Cheque>;
      stats: ChequeStats;
    };

export interface UseChequesResult {
  state: UseChequesState;
  /** دریافت دوباره‌ی فهرست و آمار با همان پارامترهای فعلی. */
  refresh: () => void;
}

const FALLBACK_ERROR = 'دریافت فهرست چک‌ها با مشکل مواجه شد. لطفاً دوباره تلاش کنید.';

/** فهرست + آمار چک‌ها را برای پارامترهای فعلی URL دریافت می‌کند. */
export function useCheques(params: UseChequesParams): UseChequesResult {
  const { page = 1, limit = 20, search = '', status, direction } = params;
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    state: UseChequesState;
  } | null>(null);

  const key = JSON.stringify({
    page,
    limit,
    search,
    status: status ?? null,
    direction: direction ?? null,
    version,
  });

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      checksApi.list({
        page,
        limit,
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
        ...(direction ? { direction } : {}),
      }),
      checksApi.stats({
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
        ...(direction ? { direction } : {}),
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
              message: resolveChequeErrorMessage(error, FALLBACK_ERROR),
            },
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [direction, key, limit, page, search, status]);

  const state: UseChequesState =
    result !== null && result.key === key ? result.state : { status: 'loading' };

  const refresh = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);

  return { state, refresh };
}
