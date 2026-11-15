'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export function usePurchaseFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = searchParams.get('status') ?? '';
  const search = searchParams.get('search') ?? '';
  const discountState = searchParams.get('discountState') ?? '';

  const replaceFilter = useCallback(
    (key: 'status' | 'discountState' | 'search', value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete('page');

      const nextQuery = params.toString();
      if (nextQuery === searchParams.toString()) return;

      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const setStatus = useCallback(
    (value: string) => replaceFilter('status', value),
    [replaceFilter],
  );

  const setDiscountState = useCallback(
    (value: string) => replaceFilter('discountState', value),
    [replaceFilter],
  );

  const setSearch = useCallback((value: string) => replaceFilter('search', value), [replaceFilter]);

  return { status, discountState, search, setStatus, setDiscountState, setSearch };
}
