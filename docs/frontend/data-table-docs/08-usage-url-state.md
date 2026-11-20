# URL State Usage

The `useDataTableUrlState` hook keeps table state in the URL (Next.js App Router). Every change updates the URL via `router.replace` — no history spam, no scroll jump.

## Quick Start

```tsx
import { useDataTableUrlState } from '@/ui/components/custom/ui/data-table';

export function InvoicesPage() {
  const url = useDataTableUrlState({
    filters: {
      date: 'date',
      status: 'multiselect',
      no: 'text',
      customer: 'text',
    },
    sortable: ['no', 'customer', 'date', 'amount', 'status'],
  });

  const { data, meta } = useInvoicesQuery(url.query);

  return (
    <DataTable columns={columns} data={data} rowKey={(r) => r.id} meta={meta} {...url.tableProps} />
  );
}
```

## Hook API

```ts
interface TableUrlSchema {
  filters?: Record<string, FilterType>;
  sortable?: string[];
  maxSortColumns?: number;
  limits?: { min: number; max: number; default: number };
}

function useDataTableUrlState(schema: TableUrlSchema = {}): {
  query: TableQueryState;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  setSorting: (sorting: SortItem[]) => void;
  setFilters: (filters: Record<string, FilterValue>) => void;
  tableProps: {
    page: number;
    limit: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
    search: string;
    onSearchChange: (search: string) => void;
    sorting: SortItem[];
    onSortingChange: (sorting: SortItem[]) => void;
    columnFilters: Record<string, FilterValue>;
    onColumnFiltersChange: (filters: Record<string, FilterValue>) => void;
  };
};
```

### Schema Options

| Option           | Type                         | Description                                                          |
| ---------------- | ---------------------------- | -------------------------------------------------------------------- |
| `filters`        | `Record<string, FilterType>` | Column id → filter type. Only listed columns are read/written to URL |
| `sortable`       | `string[]`                   | Allow-list for sort columns. Omit to accept any id                   |
| `maxSortColumns` | `number`                     | Max multi-sort columns (default: 3)                                  |
| `limits`         | `{min, max, default}`        | Page size bounds                                                     |

### Filter Types

| Type            | URL Encoding      | Example                         |
| --------------- | ----------------- | ------------------------------- |
| `'text'`        | `f.col=value`     | `f.customer=علی`                |
| `'select'`      | `f.col=value`     | `f.status=paid`                 |
| `'multiselect'` | `f.col=val1,val2` | `f.status=paid,unpaid`          |
| `'date'`        | `f.col=from..to`  | `f.date=2026-10-01..2026-10-31` |
| `'number'`      | `f.col=min..max`  | `f.amount=1000..5000`           |

---

## URL Examples

### Full State

```
GET /invoices?
  page=2&
  limit=50&
  search=کریمی&
  sort=-date,no&
  f.date=2026-10-01..2026-10-31&
  f.status=paid,partial&
  f.amount=1000000..10000000
```

| Param    | Meaning                            |
| -------- | ---------------------------------- |
| `page`   | Current page (1-based)             |
| `limit`  | Rows per page                      |
| `search` | Global search text                 |
| `sort`   | Comma-separated; `-` prefix = desc |
| `f.<id>` | Column filter (see types above)    |

### Minimal State

```
/invoices?page=3&limit=100
```

### Search Only

```
/invoices?search=علی
```

### Multi-column Sort

```
/invoices?sort=-date,amount,no
```

First click on date sorts **desc** (newest first) because `sortDescFirst: true` on the date column.

---

## Client Mode with URL State

```tsx
function ClientWithUrl() {
  const url = useDataTableUrlState({
    filters: { date: 'date', status: 'multiselect' },
    sortable: ['no', 'customer', 'date'],
  });

  const [data] = useState(invoices);

  return (
    <DataTable
      columns={columns}
      data={data}
      rowKey={(r) => r.id}
      {...url.tableProps}
      meta={null} // no meta = client mode
    />
  );
}
```

**Important:** Pass `meta={null}` explicitly to force client mode when using URL state.

---

## Pure URL Codec (No Next.js)

The codec is framework-free in `lib/url-state.ts`:

```ts
import { parseTableState, serializeTableState } from '@/ui/components/custom/ui/data-table';

const params = new URLSearchParams('page=2&limit=20&sort=-date&f.date=2026-10-01..2026-10-31');
const state = parseTableState(params, {
  filters: { date: 'date', status: 'multiselect' },
  sortable: ['date', 'no', 'amount'],
});

const newParams = serializeTableState(
  { ...state, page: 3 },
  new URLSearchParams(), // or existing params to preserve
  { filters: { date: 'date' } },
);

console.log(newParams.toString());
// "page=3&limit=20&sort=-date&f.date=2026-10-01..2026-10-31"
```

### API

```ts
function parseTableState(params: URLSearchParams, schema: TableUrlSchema): TableQueryState;

function serializeTableState(
  state: TableQueryState,
  base: URLSearchParams = new URLSearchParams(),
  schema: TableUrlSchema,
): URLSearchParams;
```

### Types

```ts
interface TableQueryState {
  page: number;
  limit: number;
  search: string;
  sorting: SortItem[];
  filters: Record<string, FilterValue>;
}

interface SortItem {
  id: string;
  desc: boolean;
}

type FilterValue =
  | string
  | string[]
  | { from?: string; to?: string } // date range
  | { min?: number; max?: number }; // number range
```

---

## React Query Integration

```tsx
function InvoicesPage() {
  const url = useDataTableUrlState({
    filters: { date: 'date', status: 'multiselect', no: 'text', customer: 'text' },
    sortable: ['no', 'customer', 'date', 'amount', 'status'],
  });

  const { data, meta } = useQuery({
    queryKey: ['invoices', url.query],
    queryFn: () => api.listInvoices(url.query),
  });

  return (
    <DataTable columns={columns} data={data} rowKey={(r) => r.id} meta={meta} {...url.tableProps} />
  );
}
```

**Query key includes full table state** — every filter/sort/page change triggers a new fetch.

---

## Server Mode with URL State

```tsx
function ServerWithUrl() {
  const url = useDataTableUrlState({
    filters: { date: 'date', status: 'multiselect' },
    sortable: ['no', 'customer', 'date', 'amount', 'status'],
    limits: { min: 10, max: 100, default: 20 },
  });

  const { data, meta } = useQuery({
    queryKey: ['invoices', url.query],
    queryFn: () => api.listInvoices(url.query),
  });

  return (
    <DataTable columns={columns} data={data} rowKey={(r) => r.id} meta={meta} {...url.tableProps} />
  );
}
```

Every URL change → `url.query` changes → React Query fetches new data.

---

## URL Schema Reference

```ts
interface TableUrlSchema {
  filters?: Record<string, FilterType>;
  sortable?: string[];
  maxSortColumns?: number; // default: 3
  limits?: {
    min: number; // minimum page size
    max: number; // maximum page size
    default: number; // default page size
  };
}

type FilterType = 'text' | 'select' | 'multiselect' | 'date' | 'number';
```

### Defaults

```ts
const DEFAULT_LIMITS = { min: 1, max: 200, default: 10 };
const MAX_SORT_COLUMNS = 3;
```

---

## URL Encoding Rules

| Type          | Encoding                                            | Decoding                      |
| ------------- | --------------------------------------------------- | ----------------------------- |
| `text`        | Raw value                                           | As-is                         |
| `select`      | Raw value                                           | As-is                         |
| `multiselect` | `encodeURIComponent(val1),encodeURIComponent(val2)` | Split by `,`, decode each     |
| `date`        | `from..to` (ISO)                                    | Split by `..`, validate ISO   |
| `number`      | `min..max`                                          | Split by `..`, parse as float |

**Dates are always Gregorian ISO** in the URL. UI shows Jalali, URL carries ISO.

---

## Back/Forward Navigation

Works automatically because `router.replace` updates history without adding entries. Clicking back returns to previous table state.

---

## Preserving Other Query Params

`serializeTableState` preserves unrelated params in the base `URLSearchParams`:

```tsx
const base = new URLSearchParams('tab=invoices&view=list');
const next = serializeTableState(state, base, schema);
// Result: "tab=invoices&view=list&page=2&limit=20&..."
```

---

## Limitations

| Limitation                      | Workaround                              |
| ------------------------------- | --------------------------------------- |
| Only one table per URL          | Use different paths or state management |
| Max 3 sort columns by default   | Increase `maxSortColumns` in schema     |
| No operator support for filters | Use `text` type for custom queries      |
| Filter types must be declared   | Add to schema `filters` object          |

---

## Testing URL State

```bash
# Test codec
pnpm --filter @repo/web test -- lib/url-state.test.ts
```

Tests cover: parsing, serialization, edge cases, multi-sort, filter types, round-trip.
