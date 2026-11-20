'use client';

import { useCallback, useEffect, useState } from 'react';

import type { Purchase } from '../assets/@types/purchase';
import {
  listAllPurchases,
  listPurchases,
  type PurchaseListResponse,
  type ListPurchasesParams,
} from '../lib/purchases.service';

export type UsePurchasesParams = Pick<
  ListPurchasesParams,
  'page' | 'limit' | 'search' | 'status' | 'discountState'
>;

export type UsePurchasesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; response: PurchaseListResponse; all: Purchase[] };

export interface UsePurchasesResult {
  state: UsePurchasesState;
  refresh: () => void;
}

export function usePurchases(params: UsePurchasesParams): UsePurchasesResult {
  const { page = 1, limit = 20, search = '', status, discountState } = params;

  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    state: UsePurchasesState;
  } | null>(null);

  const key = JSON.stringify({
    page,
    limit,
    search,
    status: status ?? null,
    discountState: discountState ?? null,
    version,
  });

  useEffect(() => {
    let isActive = true;

    Promise.all([
      listPurchases({ page, limit, search, status, discountState }),
      listAllPurchases({ search, status, discountState }),
    ])
      .then(([response, all]) => {
        if (isActive) setResult({ key, state: { status: 'success', response, all } });
      })
      .catch(() => {
        if (isActive) setResult({ key, state: { status: 'error' } });
      });

    return () => {
      isActive = false;
    };
  }, [key, page, limit, search, status, discountState]);

  const state: UsePurchasesState =
    result !== null && result.key === key ? result.state : { status: 'loading' };

  const refresh = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);

  return { state, refresh };
}
