'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { isPosStatus, type PosStatus } from '../assets/@types/pos-terminal.types';

export type PosStatusFilter = PosStatus | 'all';

function readStatus(value: string | null): PosStatusFilter {
  return value && isPosStatus(value) ? value : 'all';
}

export interface UsePosStatusFilterResult {
  status: PosStatusFilter;
  setStatus: (value: PosStatusFilter) => void;
}

/**
 * فیلتر وضعیت را در URL نگه می‌دارد (هم‌راستا با usePagination).
 * هر تغییر فیلتر، صفحه را به ۱ برمی‌گرداند تا نتیجه از ابتدا دیده شود.
 */
export function usePosStatusFilter(): UsePosStatusFilterResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = readStatus(searchParams.get('status'));

  const setStatus = useCallback(
    (value: PosStatusFilter) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value === 'all') {
        params.delete('status');
      } else {
        params.set('status', value);
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

  return { status, setStatus };
}
