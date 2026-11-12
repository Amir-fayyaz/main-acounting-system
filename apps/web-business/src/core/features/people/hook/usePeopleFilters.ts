'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export function usePeopleFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const kind = searchParams.get('kind') ?? '';
  const search = searchParams.get('search') ?? '';

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete('page');

      const nextQuery = params.toString();
      if (nextQuery === searchParams.toString()) return;
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const setKind = useCallback(
    (nextKind: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextKind) {
        params.set('kind', nextKind);
      } else {
        params.delete('kind');
      }
      params.delete('page');

      const nextQuery = params.toString();
      if (nextQuery === searchParams.toString()) return;

      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const setSearch = useCallback((value: string) => update('search', value), [update]);

  return { kind, search, setKind, setSearch };
}
