'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export function useSalesFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = searchParams.get('status') ?? '';
  const seller = searchParams.get('seller') ?? '';
  const discountState = searchParams.get('dstate') ?? '';
  const search = searchParams.get('search') ?? '';

  const update = useCallback(
    (patch: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      params.delete('page');
      const nextQuery = params.toString();
      if (nextQuery === searchParams.toString()) return;
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const setStatus = useCallback((v: string) => update({ status: v }), [update]);
  const setSeller = useCallback((v: string) => update({ seller: v }), [update]);
  const setDiscountState = useCallback((v: string) => update({ dstate: v }), [update]);
  const setSearch = useCallback((v: string) => update({ search: v }), [update]);

  return { status, seller, discountState, search, setStatus, setSeller, setDiscountState, setSearch };
}
