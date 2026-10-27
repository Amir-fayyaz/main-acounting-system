# DataTable and URL pagination

`@repo/web` ships a reusable `DataTable` with optional server-driven pagination controls and a `usePagination` hook that reads and writes the current `?page=` and `?limit=` query parameters. Page numbers are 1-based; `limit` is clamped to 1–100. Defaults are `page=1` and `limit=20`. List responses follow the backend `{ data, meta }` envelope, typed here as `PaginatedResponse<T>`.

## Usage

The table renders pagination controls only when the server's `PaginationMeta` is passed via `meta`; every displayed value — the summary and the previous/next bounds — comes from that object, never from the URL or the current row count. Without `meta`, the table renders exactly as it did without pagination. `page` and `limit` from the hook are what a future list request would send; this example does not fetch anything.

```tsx
'use client';

import { DataTable, usePagination, type DataTableColumn, type PaginatedResponse } from '@repo/web';

interface Membership {
  id: string;
  name: string;
  status: 'active' | 'paused';
}

const columns: DataTableColumn<Membership>[] = [
  { key: 'name', header: 'نام' },
  {
    key: 'status',
    header: 'وضعیت',
    cell: (row) => (row.status === 'active' ? 'فعال' : 'متوقف'),
  },
];

export function MembershipsTable({ data, meta }: PaginatedResponse<Membership>) {
  const { page, limit } = usePagination();

  // A future list request supplies the window the URL currently holds:
  //   GET /memberships?page={page}&limit={limit}  ->  PaginatedResponse<Membership>

  return (
    <DataTable
      columns={columns}
      rows={data}
      meta={meta}
      rowKey={(row) => row.id}
      aria-label="عضویت‌ها"
    />
  );
}
```

State precedence inside the table is `error` > `loading` > empty rows; `searchTerm` only chooses between the generic empty message and the search-specific one. `pageSizes` is optional — invalid entries are dropped and the current limit is always included. URL search text is handled separately by `SearchInput` (`@repo/web/ui/components/custom/ui/search-input/SearchInput`), which writes `?search=` and resets `page` when the term changes.

## Run and verify

```bash
pnpm exec tsc -p packages/web/tsconfig.json
pnpm --filter frontend exec vitest run src/core/test/DataTable.test.tsx src/core/test/usePagination.test.tsx src/core/test/SearchInput.test.tsx
```
