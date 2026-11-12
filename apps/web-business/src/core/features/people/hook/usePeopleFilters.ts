'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export function usePeopleFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const kind = searchParams.get('kind') ?? '';

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

  return { kind, setKind };
}
