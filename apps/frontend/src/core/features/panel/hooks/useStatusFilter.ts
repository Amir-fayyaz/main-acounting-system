'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * URL-synced status filter for panel list pages.
 *
 * - Reads the status query parameter (default key: `status`)
 * - Setting a value writes the parameter; clearing it removes the parameter
 * - A status change resets `page` so results restart from the first page
 * - Unrelated query parameters are preserved and redundant updates are skipped
 */
export function useStatusFilter(paramName = 'status') {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = searchParams.get(paramName) ?? '';

  const setStatus = useCallback(
    (value: string) => {
      const nextStatus = value.trim();
      if (nextStatus === status) return;

      const params = new URLSearchParams(searchParams.toString());
      if (nextStatus) {
        params.set(paramName, nextStatus);
      } else {
        params.delete(paramName);
      }
      // Filtered results always restart at the first page.
      params.delete('page');

      const nextQuery = params.toString();
      if (nextQuery === searchParams.toString()) return;

      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    },
    [paramName, pathname, router, searchParams, status],
  );

  return { status, setStatus };
}
