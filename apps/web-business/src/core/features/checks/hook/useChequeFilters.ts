'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import {
  isChequeDirection,
  isChequeStatus,
  type ChequeDirection,
  type ChequeStatus,
} from '../assets/@types/cheque.types';

export type ChequeFilterValue<TValue extends string> = TValue | 'all';

function readStatus(value: string | null): ChequeFilterValue<ChequeStatus> {
  return value && isChequeStatus(value) ? value : 'all';
}

function readDirection(value: string | null): ChequeFilterValue<ChequeDirection> {
  return value && isChequeDirection(value) ? value : 'all';
}

export interface UseChequeFiltersResult {
  status: ChequeFilterValue<ChequeStatus>;
  direction: ChequeFilterValue<ChequeDirection>;
  setStatus: (value: ChequeFilterValue<ChequeStatus>) => void;
  setDirection: (value: ChequeFilterValue<ChequeDirection>) => void;
}

/**
 * فیلترهای وضعیت/نوع را در URL نگه می‌دارد (هم‌راستا با usePagination).
 * هر تغییر فیلتر، صفحه را به ۱ برمی‌گرداند تا نتیجه از ابتدا دیده شود.
 */
export function useChequeFilters(): UseChequeFiltersResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = readStatus(searchParams.get('status'));
  const direction = readDirection(searchParams.get('direction'));

  const replaceFilter = useCallback(
    (key: 'status' | 'direction', value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
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

  const setStatus = useCallback(
    (value: ChequeFilterValue<ChequeStatus>) => {
      replaceFilter('status', value);
    },
    [replaceFilter],
  );

  const setDirection = useCallback(
    (value: ChequeFilterValue<ChequeDirection>) => {
      replaceFilter('direction', value);
    },
    [replaceFilter],
  );

  return { status, direction, setStatus, setDirection };
}
