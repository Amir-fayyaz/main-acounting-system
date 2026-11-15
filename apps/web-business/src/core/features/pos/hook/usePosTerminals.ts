'use client';

import type { PaginatedResponse } from '@repo/web';
import { useCallback, useEffect, useState } from 'react';

import type { PosTerminal, PosTerminalListParams } from '../assets/@types/pos-terminal.types';
import { posApi } from '../lib/pos-api';
import { resolvePosErrorMessage } from '../lib/pos-api.errors';

export type UsePosTerminalsParams = Pick<
  PosTerminalListParams,
  'page' | 'limit' | 'search' | 'status'
>;

export type UsePosTerminalsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; response: PaginatedResponse<PosTerminal> };

export interface UsePosTerminalsResult {
  state: UsePosTerminalsState;
  /** دریافت دوباره‌ی فهرست با همان پارامترهای فعلی. */
  refresh: () => void;
}

const FALLBACK_ERROR = 'دریافت فهرست دستگاه‌های POS با مشکل مواجه شد. لطفاً دوباره تلاش کنید.';

/** فهرست ترمینال‌ها را برای پارامترهای فعلی URL دریافت می‌کند. */
export function usePosTerminals(params: UsePosTerminalsParams): UsePosTerminalsResult {
  const { page = 1, limit = 20, search = '', status } = params;
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    state: UsePosTerminalsState;
  } | null>(null);

  const key = JSON.stringify({
    page,
    limit,
    search,
    status: status ?? null,
    version,
  });

  useEffect(() => {
    let isMounted = true;

    posApi
      .list({
        page,
        limit,
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
      })
      .then((response) => {
        if (isMounted) {
          setResult({ key, state: { status: 'success', response } });
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setResult({
            key,
            state: {
              status: 'error',
              message: resolvePosErrorMessage(error, FALLBACK_ERROR),
            },
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [key, limit, page, search, status]);

  const state: UsePosTerminalsState =
    result !== null && result.key === key ? result.state : { status: 'loading' };

  const refresh = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);

  return { state, refresh };
}
