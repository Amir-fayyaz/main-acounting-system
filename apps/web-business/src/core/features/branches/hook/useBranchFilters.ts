'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export function useBranchFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = searchParams.get('status') ?? '';
  const search = searchParams.get('search') ?? '';

  const setStatus = useCallback(
    (nextStatus: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextStatus) {
        params.set('status', nextStatus);
      } else {
        params.delete('status');
      }
      params.delete('page');

      const nextQuery = params.toString();
      if (nextQuery === searchParams.toString()) return;

      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const setSearch = useCallback(
    (nextSearch: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextSearch) params.set('search', nextSearch);
      else params.delete('search');
      params.delete('page');

      const nextQuery = params.toString();
      if (nextQuery === searchParams.toString()) return;

      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    },
    [pathname, router, searchParams],
  );

  return { status, search, setStatus, setSearch };
}
