'use client';

import { useCallback, useEffect, useState } from 'react';

import type { ListUsersParams } from '../assets/@types/user';
import { listUsers, type UserListResponse } from '../lib/users.service';

export type UseUsersParams = Pick<ListUsersParams, 'page' | 'limit' | 'search' | 'role'>;

export type UseUsersState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; response: UserListResponse };

export interface UseUsersResult {
  state: UseUsersState;
  refresh: () => void;
}

export function useUsers(params: UseUsersParams): UseUsersResult {
  const { page = 1, limit = 20, search = '', role } = params;

  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    state: UseUsersState;
  } | null>(null);

  const key = JSON.stringify({ page, limit, search, role: role ?? null, version });

  useEffect(() => {
    let isActive = true;

    listUsers({ page, limit, search, role })
      .then((response) => {
        if (isActive) setResult({ key, state: { status: 'success', response } });
      })
      .catch(() => {
        if (isActive) setResult({ key, state: { status: 'error' } });
      });

    return () => {
      isActive = false;
    };
  }, [key, page, limit, search, role]);

  const state: UseUsersState =
    result !== null && result.key === key ? result.state : { status: 'loading' };

  const refresh = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);

  return { state, refresh };
}
