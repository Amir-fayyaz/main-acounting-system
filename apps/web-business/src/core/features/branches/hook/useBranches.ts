'use client';

import { useCallback, useEffect, useState } from 'react';

import type { ListBranchesParams } from '../assets/@types/branch';
import {
  listBranches,
  type BranchListResponse,
} from '../lib/branches.service';

export type UseBranchesParams = Pick<ListBranchesParams, 'page' | 'limit' | 'search' | 'status'>;

export type UseBranchesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; response: BranchListResponse };

export interface UseBranchesResult {
  state: UseBranchesState;
  refresh: () => void;
}

export function useBranches(params: UseBranchesParams): UseBranchesResult {
  const { page = 1, limit = 20, search = '', status } = params;

  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    state: UseBranchesState;
  } | null>(null);

  const key = JSON.stringify({ page, limit, search, status: status ?? null, version });

  useEffect(() => {
    let isActive = true;

    listBranches({ page, limit, search, status })
      .then((response) => {
        if (isActive) setResult({ key, state: { status: 'success', response } });
      })
      .catch(() => {
        if (isActive) setResult({ key, state: { status: 'error' } });
      });

    return () => {
      isActive = false;
    };
  }, [key, page, limit, search, status]);

  const state: UseBranchesState =
    result !== null && result.key === key ? result.state : { status: 'loading' };

  const refresh = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);

  return { state, refresh };
}
