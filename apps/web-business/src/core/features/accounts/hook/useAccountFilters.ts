'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { isAccountType, type AccountType } from '../assets/@types/account.types';

export type AccountTypeFilter = AccountType | 'all';

function readType(value: string | null): AccountTypeFilter {
  return value && isAccountType(value) ? value : 'all';
}

export interface UseAccountFiltersResult {
  type: AccountTypeFilter;
  setType: (value: AccountTypeFilter) => void;
}

export function useAccountFilters(): UseAccountFiltersResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const type = readType(searchParams.get('type'));

  const setType = useCallback(
    (value: AccountTypeFilter) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value === 'all') {
        params.delete('type');
      } else {
        params.set('type', value);
      }

      const currentPage = params.get('page');
      if (currentPage !== null && currentPage !== '1') {
        params.set('page', '1');
      }

      const nextQuery = params.toString();
      if (nextQuery === searchParams.toString()) return;

      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    },
    [pathname, router, searchParams],
  );

  return { type, setType };
}
