# DataTable and URL Pagination

The `@repo/web` package provides reusable table and pagination utilities:

- `DataTable`: renders tabular data from typed rows and column definitions.
- `PaginationControls`: provides page navigation and page-size selection when pagination metadata is available.
- `usePagination`: reads and updates the `page` and `limit` URL query parameters.
- `SearchInput`: manages the search query in the URL and resets pagination when the search term changes.
- `PaginatedResponse<T>`: describes the backend response envelope `{ data, meta }`.

These utilities separate rendering, URL state, and data fetching. `DataTable` does not fetch data automatically; the consuming feature is responsible for requesting data from its API and passing the resulting rows and pagination metadata to the table.

## 1. Pagination behavior

The URL is the source of truth for the current pagination selection.

| Setting | Behavior |
|---|---|
| `page` | 1-based page number; defaults to `1`. |
| `limit` | Number of rows requested per page; defaults to `20` and is clamped to `1–100`. |
| `meta` | Server-provided pagination metadata used to render pagination controls and the summary. |
| `pageSizes` | Optional list of selectable page sizes. Invalid entries are discarded, and the current limit is always included. |
| `search` | Search query managed separately by `SearchInput`. Changing the term resets `page` to `1`. |

The `usePagination` hook provides the current `page` and `limit` together with the pagination update functions. Use these values when building the list API request.

Pagination is server-driven: the URL determines the requested page and limit, while the API response determines the rows and pagination metadata displayed by the table.

## 2. Basic DataTable usage

Use `DataTableColumn<T>` to define the columns and `PaginatedResponse<T>` to type the API response.

```tsx
'use client';

import {
  DataTable,
  type DataTableColumn,
  type PaginatedResponse,
} from '@repo/web';

interface Membership {
  id: string;
  name: string;
  status: 'active' | 'paused';
}

const columns: DataTableColumn<Membership>[] = [
  {
    key: 'name',
    header: 'نام',
  },
  {
    key: 'status',
    header: 'وضعیت',
    cell: (row) =>
      row.status === 'active' ? 'فعال' : 'متوقف',
  },
];

interface MembershipsTableProps {
  response: PaginatedResponse<Membership>;
}

export function MembershipsTable({
  response,
}: MembershipsTableProps) {
  const { data, meta } = response;

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

### How it works

- `columns` defines the displayed columns.
- `key` identifies the field associated with a column.
- `header` defines the column heading.
- `cell` optionally customizes how a cell is rendered. The callback receives the row.
- `rows` supplies the data to display.
- `rowKey` supplies a stable, unique key for each row.
- `meta` supplies the server's pagination metadata.
- `aria-label` provides an accessible name for the table.

The example above renders an existing response. It does not perform an API request.

## 3. Connecting URL pagination to an API request

Use `usePagination` in the client-side feature that owns the list request. Pass its `page` and `limit` values to the API and pass the resulting response to `DataTable`.

```tsx
'use client';

import {
  DataTable,
  usePagination,
  type DataTableColumn,
  type PaginatedResponse,
} from '@repo/web';

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
    cell: (row) =>
      row.status === 'active' ? 'فعال' : 'متوقف',
  },
];

interface MembershipListProps {
  response: PaginatedResponse<Membership>;
}

export function MembershipList({
  response,
}: MembershipListProps) {
  const { page, limit } = usePagination();

  // The feature's data-fetching layer should request:
  // GET /memberships?page={page}&limit={limit}

  return (
    <DataTable
      columns={columns}
      rows={response.data}
      meta={response.meta}
      rowKey={(row) => row.id}
      aria-label="عضویت‌ها"
    />
  );
}
```

**Important:** This example illustrates how pagination state is consumed; it intentionally does not implement fetching, caching, or loading-state management. In a real feature, connect `page` and `limit` to the project's existing API and data-fetching conventions.

Whenever the URL pagination changes, the list feature should request the corresponding page and render the returned `data` and `meta`. Do not calculate server pagination metadata from the currently displayed rows.

## 4. Combining DataTable with SearchInput

`SearchInput` is a separate shared component. It manages the `search` query parameter, rather than implementing search inside `DataTable`.

Import it from:

```tsx
import SearchInput from
  '@repo/web/ui/components/custom/ui/search-input/SearchInput';
```

Use it alongside the table in the list feature's UI. The feature's data-fetching layer should use the search query together with `page` and `limit` when requesting filtered results.

When the search term changes, `SearchInput` resets `page` to `1`. This prevents a filtered list from remaining on a page that may no longer exist.

For a searchable, paginated list, the responsibilities are:

1. `SearchInput` updates the URL search term and resets pagination.
2. `usePagination` provides the current page and page size.
3. The list feature requests data using the current search and pagination parameters.
4. `DataTable` renders the returned rows and metadata.

The precise `SearchInput` props and the API integration should follow the component's current implementation and the project's existing fetching conventions.

## 5. Pagination metadata and rendering

Pagination controls are rendered only when `meta` is provided.

The summary and previous/next navigation bounds are derived from the supplied `PaginationMeta`, not inferred from the URL or the number of rows currently rendered.

Without `meta`, `DataTable` renders without pagination controls.

For example, if the server returns 20 rows for page 2 and reports 135 total items, the table displays those 20 rows and uses the server metadata to determine the pagination summary and navigation bounds.

Always pass the metadata returned by the API for the same response as the rows.

## 6. Empty, loading, and error states

The table's state precedence is:

1. `error`
2. `loading`
3. Empty rows

`searchTerm` determines whether an empty result uses the generic empty message or the search-specific empty message.

Pass these state props from the feature that owns the request. Avoid implementing a second, conflicting loading or error state inside the table.

## 7. Page-size options

`pageSizes` is optional. Invalid entries are discarded, and the current `limit` is included in the available options even if it is not part of the configured list.

Use this prop when a feature needs to offer specific page sizes. The `limit` selected through pagination is URL state and should be used for the next API request.

## 8. TypeScript and API response shape

List responses follow this envelope:

```ts
interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
```

Use the actual exported `PaginatedResponse<T>` and `PaginationMeta` types from `@repo/web` instead of defining duplicate local types.

The backend response should remain the source of truth for pagination totals and bounds. Do not replace server metadata with calculations based only on the current page's rows.

## 9. Verification

From the repository root, run the shared package type check:

```bash
pnpm exec tsc -p packages/web/tsconfig.json
```

Run the relevant frontend tests:

```bash
pnpm --filter frontend exec vitest run \
  src/core/test/DataTable.test.tsx \
  src/core/test/usePagination.test.tsx \
  src/core/test/SearchInput.test.tsx
```

The tests cover the relevant shared table, pagination, and search behavior. Run `pnpm verify` to execute the repository's full quality gates.

