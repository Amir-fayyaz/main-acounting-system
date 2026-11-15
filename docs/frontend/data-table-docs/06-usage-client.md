# Client Mode Usage

Client mode is the default when no `meta` prop is provided. All sorting, filtering, searching, and pagination happen in the browser.

## Minimal Example

```tsx
import { DataTable } from '@/ui/components/custom/ui/data-table';
import type { DataTableColumn } from '@/ui/components/custom/ui/data-table';

interface Invoice {
  id: string;
  no: string;
  customer: string;
  date: string; // Gregorian ISO
  amount: number;
  status: 'paid' | 'unpaid';
}

// Define columns OUTSIDE the component (or useMemo) so rows stay memoized
const columns: DataTableColumn<Invoice>[] = [
  { key: 'no', header: 'شماره', sortable: true },
  { key: 'customer', header: 'مشتری', filter: true },
  { key: 'date', header: 'تاریخ', type: 'date', sortDescFirst: true },
  { key: 'amount', header: 'مبلغ', type: 'money', currency: 'ریال' },
  {
    key: 'status',
    header: 'وضعیت',
    type: 'status',
    status: {
      paid: { label: 'پرداخت‌شده', tone: 'success' },
      unpaid: { label: 'باقی‌مانده', tone: 'danger' },
    },
  },
];

export function InvoicesTable({ invoices }: { invoices: Invoice[] }) {
  return (
    <DataTable
      columns={columns}
      data={invoices}
      rowKey={(r) => r.id}
      persistKey="invoices"
      rowNumbers
      defaultPageSize={10}
    />
  );
}
```

## Full Featured Client Table

```tsx
const rowActions = useMemo<RowAction<Invoice>[]>(
  () => [
    {
      id: 'edit',
      kind: 'edit',
      label: 'ویرایش',
      inline: true,
    },
    {
      id: 'view',
      label: 'مشاهده',
      icon: <Eye className="size-4" />,
      onSelect: (r) => router.push(`/invoices/${r.id}`),
    },
  ],
  [],
);

const bulkActions = useMemo<BulkAction<Invoice>[]>(
  () => [
    {
      id: 'delete',
      label: 'حذف انتخاب‌شده‌ها',
      variant: 'destructive',
      reason: true,
      onSelect: (rows) => setData((d) => d.filter((x) => !rows.some((r) => r.id === x.id))),
    },
  ],
  [],
);

return (
  <DataTable
    columns={columns}
    data={invoices}
    rowKey={(r) => r.id}
    persistKey="invoices"
    rowNumbers
    selectable
    rowActions={rowActions}
    bulkActions={bulkActions}
    reorderableRows
    reorderableColumns
    onRowReorder={(e) => setData((d) => reorderById(d, e.activeId, e.overId, (x) => x.id))}
    editReason={{ label: 'دلیل ویرایش', presets: ['اصلاح مبلغ', 'اصلاح تاریخ'] }}
    onRowSave={async (row, patch) => {
      await api.updateInvoice(row.id, patch);
      setData((d) => d.map((x) => (x.id === row.id ? { ...x, ...patch } : x)));
    }}
    exportFileName="invoices"
    defaultPageSize={20}
    summaryLabel="جمع این صفحه"
  />
);
```

## Controlled Client State

```tsx
function InvoicesPage() {
  const [sorting, setSorting] = useState<SortItem[]>([]);
  const [filters, setFilters] = useState<Record<string, FilterValue>>({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  return (
    <DataTable
      columns={columns}
      data={invoices}
      rowKey={(r) => r.id}
      sorting={sorting}
      onSortingChange={setSorting}
      columnFilters={filters}
      onColumnFiltersChange={setFilters}
      search={search}
      onSearchChange={setSearch}
      page={page}
      limit={limit}
      onPageChange={setPage}
      onLimitChange={setLimit}
      pageSizes={[10, 20, 50, 100]}
      defaultPageSize={20}
      // pagination is controlled — no meta needed
    />
  );
}
```

## Disabling Pagination

```tsx
<DataTable
  columns={columns}
  data={invoices}
  rowKey={(r) => r.id}
  paginate={false}
  virtualize
  maxHeight={520}
/>
```

Shows all rows without pagination. Combine with `virtualize` for large datasets.

## Persisting View Preferences

```tsx
<DataTable
  columns={columns}
  data={invoices}
  rowKey={(r) => r.id}
  persistKey="invoices-list"
  // Saves to localStorage:
  // - column visibility
  // - column order
  // - density (compact/comfortable)
/>
```

Each user's preferences are stored under the `persistKey` in localStorage.

## Client Mode CSV Export

```tsx
<DataTable columns={columns} data={invoices} rowKey={(r) => r.id} exportFileName="invoices" />
```

Click the export button in the toolbar to download a CSV of **all filtered/sorted client data** with Gregorian ISO dates and raw numbers.

## Client Mode with URL State

For deep-linkable filters, use `useDataTableUrlState` — see [08-usage-url-state.md](./08-usage-url-state.md).

## Key Requirements

| Must                                   | Why                                                   |
| -------------------------------------- | ----------------------------------------------------- |
| `columns` defined outside or `useMemo` | Keeps `RowView` memoized                              |
| `rowKey` returns stable identity       | Required for selection, edit, DnD                     |
| `data` array is the current page       | Client mode: full array; server mode: page slice only |
| `defaultPageSize` for initial size     | Client mode only                                      |

## Common Patterns

### Local State + Persist

```tsx
const [data, setData] = useState(() => loadFromStorage() || initialData);

<DataTable
  data={data}
  onRowSave={async (row, patch) => {
    await api.update(row.id, patch);
    setData((d) => d.map((x) => (x.id === row.id ? { ...x, ...patch } : x)));
  }}
/>;
```

### Bulk Delete Pattern

```tsx
const bulkActions = useMemo<BulkAction<Invoice>[]>(
  () => [
    {
      id: 'delete',
      label: 'حذف',
      variant: 'destructive',
      reason: { required: true, presets: ['اشتباه', 'لغو'] },
      onSelect: async (rows) => {
        await api.bulkDelete(rows.map((r) => r.id));
        setData((d) => d.filter((x) => !rows.some((r) => r.id === x.id)));
      },
    },
  ],
  [],
);
```

### Toolbar Customization

```tsx
<DataTable
  toolbar={{
    search: true,
    columns: true,
    density: true,
    export: true,
  }}
  toolbarStart={<CustomFilter />}
  toolbarEnd={<CreateButton />}
/>
```
