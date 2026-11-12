'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export function useUserFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const role = searchParams.get('role') ?? '';
  const search = searchParams.get('search') ?? '';

  const setRole = useCallback(
    (nextRole: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextRole) {
        params.set('role', nextRole);
      } else {
        params.delete('role');
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

  return { role, search, setRole, setSearch };
}
