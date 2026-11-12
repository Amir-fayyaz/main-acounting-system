'use client';

import { useCallback, useEffect, useState } from 'react';

import type { ListPeopleParams } from '../assets/@types/person';
import {
  listPeople,
  type PersonListResponse,
} from '../lib/people.service';

export type UsePeopleParams = Pick<ListPeopleParams, 'page' | 'limit' | 'search' | 'kind' | 'sort'>;

export type UsePeopleState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; response: PersonListResponse };

export interface UsePeopleResult {
  state: UsePeopleState;
  refresh: () => void;
}

export function usePeople(params: UsePeopleParams): UsePeopleResult {
  const { page = 1, limit = 20, search = '', kind, sort } = params;

  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    state: UsePeopleState;
  } | null>(null);

  const key = JSON.stringify({ page, limit, search, kind: kind ?? null, sort: sort ?? null, version });

  useEffect(() => {
    let isActive = true;

    listPeople({ page, limit, search, kind, sort })
      .then((response) => {
        if (isActive) setResult({ key, state: { status: 'success', response } });
      })
      .catch(() => {
        if (isActive) setResult({ key, state: { status: 'error' } });
      });

    return () => {
      isActive = false;
    };
  }, [key, page, limit, search, kind, sort]);

  const state: UsePeopleState =
    result !== null && result.key === key ? result.state : { status: 'loading' };

  const refresh = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);

  return { state, refresh };
}
