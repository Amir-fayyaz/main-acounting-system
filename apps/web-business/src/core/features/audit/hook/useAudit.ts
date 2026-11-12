'use client';

import { useEffect, useState } from 'react';

import type { ListAuditParams } from '../assets/@types/audit';
import { listAudit, type AuditListResponse } from '../lib/audit.service';

export type UseAuditParams = Pick<ListAuditParams, 'page' | 'limit' | 'search' | 'outcome'>;

export type UseAuditState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; response: AuditListResponse };

export interface UseAuditResult {
  state: UseAuditState;
}

export function useAudit(params: UseAuditParams): UseAuditResult {
  const { page = 1, limit = 20, search = '', outcome } = params;

  const [result, setResult] = useState<{
    key: string;
    state: UseAuditState;
  } | null>(null);

  const key = JSON.stringify({ page, limit, search, outcome: outcome ?? null });

  useEffect(() => {
    let isActive = true;

    listAudit({ page, limit, search, outcome })
      .then((response) => {
        if (isActive) setResult({ key, state: { status: 'success', response } });
      })
      .catch(() => {
        if (isActive) setResult({ key, state: { status: 'error' } });
      });

    return () => {
      isActive = false;
    };
  }, [key, page, limit, search, outcome]);

  const state: UseAuditState =
    result !== null && result.key === key ? result.state : { status: 'loading' };

  return { state };
}
