'use client';
import { useCallback, useEffect, useState } from 'react';
import type { SessionResponse } from '../assets/@types/session.types';
import { getSessionAction, clearAuthToken, type SessionActionResult } from '../lib/storage';

type Status = 'loading' | 'authenticated' | 'unauthenticated';

export function useSession() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  const refresh = useCallback(async () => {
    setStatus('loading');
    const res: SessionActionResult = await getSessionAction();
    if (res.ok) {
      setSession(res.session);
      setStatus('authenticated');
      return;
    }
    if (res.error.status === 401) await clearAuthToken();
    setSession(null);
    setStatus('unauthenticated');
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { session, principal: session?.principal ?? null, status, refresh };
}