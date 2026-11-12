# Server Mode Usage

In server mode, sorting, filtering, and pagination are handled by your API. The table becomes a **controlled** component — you pass `data`, `meta`, and callbacks.

## Basic Server Mode

```tsx
import { DataTable } from '@/ui/components/custom/ui/data-table';
import type { DataTableColumn, DataTableProps } from '@/ui/components/custom/ui/data-table';
import type { PaginationMeta } from '@/ui/components/custom/ui/data-table';

interface Invoice {
  id: string;
  no: string;
  customer: string;
  date: string;
  amount: number;
  status: string;
}

const columns: DataTableColumn<Invoice>[] = [
  { key: 'no', header: 'شماره' },
  { key: 'customer', header: 'مشتری' },
  { key: 'date', header: 'تاریخ', type: 'date' },
  { key: 'amount', header: 'مبلغ', type: 'money', currency: 'ریال' },
  { key: 'status', header: 'وضعیت', type: 'status', status: STATUS },
];

export function ServerTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sorting, setSorting] = useState<SortItem[]>([]);
  const [filters, setFilters] = useState<Record<string, FilterValue>>({});
  const [search, setSearch] = useState('');

  // Your data fetching logic
  const { data, meta, isLoading } = useInvoicesQuery({
    page,
    limit,
    sorting,
    filters,
    search,
  });

  return (
    <DataTable
      columns={columns}
      data={data}
      rowKey={(r) => r.id}
      meta={meta}
      page={page}
      limit={limit}
      onPageChange={setPage}
      onLimitChange={setLimit}
      sorting={sorting}
      onSortingChange={setSorting}
      columnFilters={filters}
      onColumnFiltersChange={setFilters}
      search={search}
      onSearchChange={setSearch}
      loading={isLoading}
      pageSizes={[10, 20, 50, 100]}
      selectable
    />
  );
}
```

**Note:** All state is controlled by you. The table never fetches data — you pass it in via `data` and `meta`.

## PaginationMeta Shape

```ts
interface PaginationMeta {
  page: number; // current page (1-based)
  limit: number; // rows per page
  total: number; // total rows in server
  totalPages: number; // calculated total
}
```

Your API response must match `PaginatedResponse<T>`:

```ts
interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
```

## React Query Pattern

The recommended pattern is to make `queryKey` depend on table state:

```tsx
function useInvoicesQuery(params: {
  page: number;
  limit: number;
  sorting: SortItem[];
  filters: Record<string, FilterValue>;
  search: string;
}) {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: () => api.listInvoices(params),
    placeholderData: keepPreviousData,
  });
}
```

```tsx
function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sorting, setSorting] = useState<SortItem[]>([]);
  const [filters, setFilters] = useState<Record<string, FilterValue>>({});
  const [search, setSearch] = useState('');

  const { data, meta, isLoading } = useInvoicesQuery({
    page,
    limit,
    sorting,
    filters,
    search,
  });

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      rowKey={(r) => r.id}
      meta={meta}
      page={page}
      limit={limit}
      onPageChange={setPage}
      onLimitChange={setLimit}
      sorting={sorting}
      onSortingChange={setSorting}
      columnFilters={filters}
      onColumnFiltersChange={setFilters}
      search={search}
      onSearchChange={setSearch}
      loading={isLoading}
    />
  );
}
```

## URL-Driven Server Mode

The most common pattern — `useDataTableUrlState` keeps URL in sync with API:

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
    <DataTable
      columns={columns}
      data={data}
      rowKey={(r) => r.id}
      meta={meta}
      {...url.tableProps}
      selectable
    />
  );
}
```

Every change to page, sort, filter, or search updates the URL via `router.replace`. Back/forward buttons work.

See [08-usage-url-state.md](./08-usage-url-state.md) for full details.

## Server Mode with Row Actions

Row actions work the same in server mode — just refresh the list after mutating:

```tsx
const rowActions = useMemo<RowAction<Invoice>[]>(
  () => [
    {
      id: 'delete',
      label: 'حذف',
      variant: 'destructive',
      confirm: { title: 'حذف فاکتور؟', description: 'این عمل قابل بازگشت نیست.' },
      reason: { required: true, presets: ['اشتباه', 'لغو'] },
      onSelect: async (row) => {
        await api.deleteInvoice(row.id);
        // Refetch or invalidate query
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      },
    },
  ],
  [],
);

return (
  <DataTable
    columns={columns}
    data={data}
    rowKey={(r) => r.id}
    meta={meta}
    {...url.tableProps}
    rowActions={rowActions}
  />
);
```

## Bulk Actions in Server Mode

Bulk actions require sending selected IDs to the API:

```tsx
<DataTable
  columns={columns}
  data={data}
  rowKey={(r) => r.id}
  meta={meta}
  {...url.tableProps}
  selectable
  bulkActions={[
    {
      id: 'delete',
      label: 'حذف انتخاب‌شده‌ها',
      variant: 'destructive',
      reason: true,
      onSelect: async (rows) => {
        await api.bulkDelete(rows.map((r) => r.id));
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      },
    },
  ]}
/>
```

## Server CSV Export

**CSV export in server mode only exports the current page.** If you need full export:

1. Trigger an API endpoint that returns CSV/Excel
2. Use `exportFileName` only for client-mode full data
3. Server mode: provide a custom export button

```tsx
<DataTable
  columns={columns}
  data={data}
  rowKey={(r) => r.id}
  meta={meta}
  {...url.tableProps}
  toolbar={{
    search: true,
    columns: true,
    density: true,
    export: false, // disable built-in export
  }}
  toolbarEnd={<Button onClick={() => api.exportInvoices(url.query)}>خروجی کامل CSV</Button>}
/>
```

## Server Mode with Summary Footer

For aggregated totals from the server:

```tsx
<DataTable
  columns={columns}
  data={data}
  rowKey={(r) => r.id}
  meta={meta}
  {...url.tableProps}
  summary={{
    amount: <span>جمع صفحه: {formatMoney(pageTotal)}</span>,
    discount: <span>تخفیف: {formatMoney(pageDiscount)}</span>,
  }}
  summaryLabel="جمع"
/>
```

Or compute client-side totals for the current page:

```tsx
const columns = [
  {
    key: 'amount',
    header: 'مبلغ',
    type: 'money',
    footer: (rows) => formatMoney(rows.reduce((sum, r) => sum + r.amount, 0)),
  },
];
```

## Controlled vs Uncontrolled

Server mode is **always controlled** — you must provide:

- `meta`
- `page` + `onPageChange`
- `limit` + `onLimitChange`

Sorting, filtering, and search are optional — if provided, they become controlled.

## Important Rules for Server Mode

| Rule                                        | Why                                                                    |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| Never pass full dataset                     | Only pass current page data; total comes from `meta.total`             |
| Dates in API are Gregorian ISO              | API ↔ URL ↔ table all use ISO strings                                  |
| `columnFilters` values are processed by you | Map to your API query params (e.g., `f.date` → `date_from`, `date_to`) |
| Selection clears on view change             | `viewKey` changes when sorting/filtering/page changes — intentional    |
| `editReason` works but needs API refresh    | After `onRowSave`, refetch or invalidate query                         |

## Server Mode Debugging

If pagination controls don't appear:

- `meta` is missing or `undefined`
- `page` / `limit` / `onPageChange` / `onLimitChange` are missing
- `totalPages` is 0 or 1

If filters don't work:

- `columnFilters` not passed to API
- Filter values not mapped to API query params
- Column `id` doesn't match filter key in URL schema
