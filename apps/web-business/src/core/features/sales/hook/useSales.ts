'use client';

import { useCallback, useEffect, useState } from 'react';

import type { ListSalesParams } from '../assets/@types/sale';
import { listSales, type SaleListResponse } from '../lib/sales.service';

export type UseSalesParams = Pick<ListSalesParams, 'page' | 'limit' | 'search' | 'status' | 'seller' | 'discountState'>;

export type UseSalesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; response: SaleListResponse };

export interface UseSalesResult {
  state: UseSalesState;
  refresh: () => void;
}

export function useSales(params: UseSalesParams): UseSalesResult {
  const { page = 1, limit = 20, search = '', status, seller, discountState } = params;

  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    state: UseSalesState;
  } | null>(null);

  const key = JSON.stringify({ page, limit, search, status: status ?? null, seller: seller ?? null, discountState: discountState ?? null, version });

  useEffect(() => {
    let isActive = true;

    listSales({ page, limit, search, status, seller, discountState })
      .then((response) => {
        if (isActive) setResult({ key, state: { status: 'success', response } });
      })
      .catch(() => {
        if (isActive) setResult({ key, state: { status: 'error' } });
      });

    return () => {
      isActive = false;
    };
  }, [key, page, limit, search, status, seller, discountState]);

  const state: UseSalesState =
    result !== null && result.key === key ? result.state : { status: 'loading' };

  const refresh = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);

  return { state, refresh };
}
