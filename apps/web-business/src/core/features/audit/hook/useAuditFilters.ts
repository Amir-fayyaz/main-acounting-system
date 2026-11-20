'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export function useAuditFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const outcome = searchParams.get('outcome') ?? '';
  const search = searchParams.get('search') ?? '';

  const setOutcome = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set('outcome', next);
      else params.delete('outcome');
      params.delete('page');
      const nextQuery = params.toString();
      if (nextQuery === searchParams.toString()) return;
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const setSearch = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set('search', next);
      else params.delete('search');
      params.delete('page');
      const nextQuery = params.toString();
      if (nextQuery === searchParams.toString()) return;
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    },
    [pathname, router, searchParams],
  );

  return { outcome, search, setOutcome, setSearch };
}
