'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { FilterValue } from '../filters/filter-types';
import {
  parseTableState,
  serializeTableState,
  type SortItem,
  type TableQueryState,
  type TableUrlSchema,
} from '../lib/url-state';

/**
 * Keeps page / limit / search / sort / column filters in the URL (Next.js App Router).
 *
 *   const url = useDataTableUrlState({ filters: { date: 'date', status: 'multiselect' } });
 *   const { data, meta } = useInvoices(url.query);          // ← send url.query to your API
 *   <DataTable {...url.tableProps} data={data} meta={meta} columns={columns} />
 *
 * - Every change is ONE router.replace (no history spam, no scroll jump).
 * - Changing search / sort / filters / limit resets the page to 1 automatically.
 * - Back-to-back updates in the same tick compose correctly.
 */
export function useDataTableUrlState(schema: TableUrlSchema = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramsKey = searchParams?.toString() ?? '';
  const schemaKey = JSON.stringify(schema);

  const parsed = React.useMemo(
    () => parseTableState(new URLSearchParams(paramsKey), JSON.parse(schemaKey) as TableUrlSchema),
    [paramsKey, schemaKey],
  );

  const latest = React.useRef(parsed);
  latest.current = parsed;

  const commit = React.useCallback(
    (patch: Partial<TableQueryState>, resetPage = true) => {
      const prev = latest.current;
      const next: TableQueryState = { ...prev, ...patch };
      if (resetPage && patch.page === undefined) next.page = 1;
      if (JSON.stringify(next) === JSON.stringify(prev)) return; // idempotent
      latest.current = next; // optimistic, so consecutive commits compose
      const qs = serializeTableState(
        next,
        new URLSearchParams(paramsKey),
        JSON.parse(schemaKey) as TableUrlSchema,
      ).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, paramsKey, schemaKey],
  );

  const setPage = React.useCallback((page: number) => commit({ page }, false), [commit]);
  const setLimit = React.useCallback((limit: number) => commit({ limit }), [commit]);
  const setSearch = React.useCallback((search: string) => commit({ search }), [commit]);
  const setSorting = React.useCallback((sorting: SortItem[]) => commit({ sorting }), [commit]);
  const setFilters = React.useCallback(
    (filters: Record<string, FilterValue>) => commit({ filters }),
    [commit],
  );

  return {
    /** Send this to your API. Dates inside `filters` are Gregorian ISO. */
    query: parsed,
    setPage,
    setLimit,
    setSearch,
    setSorting,
    setFilters,
    /** Spread onto <DataTable />. */
    tableProps: {
      page: parsed.page,
      limit: parsed.limit,
      onPageChange: setPage,
      onLimitChange: setLimit,
      search: parsed.search,
      onSearchChange: setSearch,
      sorting: parsed.sorting,
      onSortingChange: setSorting,
      columnFilters: parsed.filters,
      onColumnFiltersChange: setFilters,
    },
  };
}
