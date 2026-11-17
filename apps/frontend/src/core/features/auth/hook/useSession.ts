'use client';
import { useCallback, useEffect, useState } from 'react';
import type { SessionResponse } from '@repo/web/session/types';
import { clearAuthToken, getSessionAction } from '@repo/web/session/storage';

type Status = 'loading' | 'authenticated' | 'unauthenticated';

/**
 * cookie `Token` فقط‌سرور (httpOnly) است؛ بنابراین session از طریق
 * Server Action خوانده می‌شود. اگر 401 بیاید cookie منقضی پاک می‌شود.
 */
export function useSession() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  const refresh = useCallback(async () => {
    setStatus('loading');
    const res = await getSessionAction();
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- دریافت session هنگام mount
    void refresh();
  }, [refresh]);

  return { session, principal: session?.principal ?? null, status, refresh };
}
