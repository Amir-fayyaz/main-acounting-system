# Advanced Usage

## Drag & Drop

### Row Reordering

```tsx
<DataTable
  columns={columns}
  data={data}
  rowKey={(r) => r.id}
  reorderableRows
  onRowReorder={(e) => setData((d) => reorderById(d, e.activeId, e.overId, (x) => x.id))}
/>
```

- `reorderableRows` enables row drag handle
- `onRowReorder` receives `RowReorderEvent<T>` with `activeId`, `overId`, `oldIndex`, `newIndex`, `rows` (already reordered)
- **Disabled during**: active sort, inline editing, virtualized mode

### Column Reordering

```tsx
<DataTable
  columns={columns}
  data={data}
  rowKey={(r) => r.id}
  reorderableColumns
  columnOrder={['no', 'customer', 'amount', 'date']}
  onColumnOrderChange={(order) => setOrder(order)}
/>
```

- Drag column headers to reorder
- Works with `persistKey` to save order

### Persistence

```tsx
<DataTable
  persistKey="invoices"
  reorderableRows
  reorderableColumns
  columnVisibility={{ due: false }}
  columnOrder={['no', 'customer', 'amount', 'date']}
  density="comfortable"
/>
```

- Saves to `localStorage` under `persistKey`
- Persists: column visibility, column order, density
- Loaded automatically on mount

---

## Virtualization

For large datasets (1,000+ rows), enable windowed rendering:

```tsx
<DataTable
  columns={columns}
  data={largeData}
  rowKey={(r) => r.id}
  virtualize
  maxHeight={600}
  paginate={false} // usually with no pagination
/>
```

### Requirements

| Prop         | Required | Notes                               |
| ------------ | -------- | ----------------------------------- |
| `virtualize` | Yes      | Enables TanStack Virtual            |
| `maxHeight`  | Yes      | Container height (px or CSS)        |
| `paginate`   | `false`  | Usually disabled for virtualization |

### Limitations

| Limitation        | Notes                                                 |
| ----------------- | ----------------------------------------------------- |
| Row DnD disabled  | `reorderableRows` ignored when virtualize is on       |
| Fixed row height  | Uses `estimateSize` (37px compact / 53px comfortable) |
| No sticky columns | Only header is sticky                                 |
| Row height fixed  | Variable height rows not supported                    |

### When to Use

| Dataset Size | Recommendation                           |
| ------------ | ---------------------------------------- |
| < 500 rows   | Pagination is fine                       |
| 500 – 5,000  | Virtualize + no pagination               |
| 5,000+       | Server mode + pagination (or virtualize) |

---

## Selection Rules

### Selectable Prop

```tsx
<DataTable selectable onSelectionChange={(rows, ids) => console.log(rows, ids)} />
```

### Selection Behavior

| Trigger                  | Selection Cleared? |
| ------------------------ | ------------------ |
| Page change              | **Yes**            |
| Filter change            | **Yes**            |
| Sort change              | **Yes**            |
| Search change            | **Yes**            |
| Column visibility change | No                 |
| Column reorder           | No                 |
| Density change           | No                 |

**Why:** Selection is tied to `viewKey` which changes when the visible row set changes. This prevents accidental bulk operations on stale selections.

### Shift-Range Select

Hold **Shift** + click checkbox to select range between last clicked and current.

### Select All

Header checkbox: selects all rows on current page only.

### Shift-Range Implementation

```tsx
const { select } = useRowSelection<Invoice>({
  rowIds,
  pageRows,
  viewKey,
  onSelectionChange: props.onSelectionChange,
});
// select(rowId, checked, shift) handles shift-range internally
```

---

## CSV Export

### Client Mode

```tsx
<DataTable columns={columns} data={data} rowKey={(r) => r.id} exportFileName="invoices" />
```

- Exports **all filtered/sorted client data** (not just current page)
- Click toolbar export button

### Server Mode

```tsx
<DataTable
  columns={columns}
  data={pageData}
  rowKey={(r) => r.id}
  meta={meta}
  exportFileName="invoices"
/>
```

**Server mode only exports current page.** For full export:

```tsx
<DataTable
  toolbar={{
    export: false, // disable built-in
  }}
  toolbarEnd={<Button onClick={() => api.exportAllInvoicesToCsv(filters)}>خروجی کامل CSV</Button>}
/>
```

### Export Format

| Type     | CSV Value            | Example       |
| -------- | -------------------- | ------------- |
| `text`   | Raw string           | `"علی کریمی"` |
| `number` | Raw number           | `1234.5`      |
| `money`  | Raw number           | `1234500`     |
| `date`   | Gregorian ISO        | `2026-10-19`  |
| `status` | Status label         | `پرداخت‌شده`  |
| `custom` | `exportValue` or raw | —             |

### CSV Format

- UTF-8 with BOM (`\uFEFF`)
- RFC 4180 quoting (commas, quotes escaped)
- Formula injection guard: `=...` → `'=...`
- Persian digits in status labels, Latin digits for numbers

### Custom Export Value

```tsx
{
  key: 'status',
  header: 'وضعیت',
  type: 'status',
  status: STATUS,
  exportValue: (row) => STATUS[row.status]?.label ?? row.status,
},
```

---

## Toolbar Customization

```tsx
<DataTable
  toolbar={{
    search: true,
    columns: true,
    density: true,
    export: true,
  }}
  toolbarStart={<CustomFilter />}
  toolbarEnd={<CreateInvoiceButton />}
/>
```

### ToolbarOptions

```ts
interface ToolbarOptions {
  search?: boolean; // default true
  columns?: boolean; // default true
  density?: boolean; // default true
  export?: boolean; // default true
}
```

### Custom Slots

```tsx
<DataTable
  toolbarStart={<DateRangePicker value={dateRange} onChange={(range) => setDateFilter(range)} />}
  toolbarEnd={
    <>
      <RefreshButton onClick={() => refetch()} />
      <CreateInvoiceButton />
    </>
  }
/>
```

---

## Active Filters Bar

Shows applied filters as removable chips above the table:

```tsx
<DataTable
  columns={columns}
  data={data}
  rowKey={(r) => r.id}
  columnFilters={filters}
  onColumnFiltersChange={setFilters}
  search={search}
  onSearchChange={setSearch}
/>
```

- Click chip to remove filter
- "Clear all" button when multiple filters active
- Search term shown as chip if non-empty

---

## Loading / Empty / Error States

```tsx
<DataTable
  columns={columns}
  data={[]}
  loading
  loadingMessage="در حال بارگذاری فاکتورها…"
  emptyMessage="فاکتوری یافت نشد"
  searchEmptyMessage="برای این جستجو نتیجه‌ای یافت نشد"
  error={errorMessage}
  toolbar={false}
/>
```

### Messages

| Prop                 | Default                            |
| -------------------- | ---------------------------------- |
| `loadingMessage`     | `در حال بارگذاری…`                 |
| `emptyMessage`       | `موردی یافت نشد`                   |
| `searchEmptyMessage` | `برای این جستجو نتیجه‌ای یافت نشد` |

---

## Error Row

```tsx
<DataTable
  columns={columns}
  data={data}
  error={<span className="text-destructive">خطا در اتصال به سرور</span>}
  rowKey={(r) => r.id}
/>
```

---

## Summary / Footer

### Client Mode

```tsx
import { sumFooter } from '@/ui/components/custom/ui/data-table';

const columns = [
  { key: 'amount', header: 'مبلغ', type: 'money', footer: sumFooter<Invoice>('amount') },
  { key: 'discount', header: 'تخفیف', type: 'money', footer: sumFooter<Invoice>('discount') },
];

<DataTable columns={columns} data={data} rowKey={(r) => r.id} summaryLabel="جمع این صفحه" />;
```

### Server Mode

```tsx
<DataTable
  columns={columns}
  data={data}
  meta={meta}
  summary={{
    amount: <span>جمع کل: {formatMoney(totalAmount)}</span>,
    discount: <span>تخفیف کل: {formatMoney(totalDiscount)}</span>,
  }}
  summaryLabel="جمع کل"
/>
```

---

## Row Class Names

```tsx
<DataTable
  rowClassName={(row) => (row.status === 'void' ? 'opacity-50 line-through' : undefined)}
  columns={columns}
  data={data}
  rowKey={(r) => r.id}
/>
```

- Return `string` or `undefined`
- Applied to `<tr>` element

---

## ARIA & Accessibility

```tsx
<DataTable aria-label="فاکتورهای فروش" columns={columns} data={data} rowKey={(r) => r.id} />
```

- `aria-label` on table
- `role="grid"` on table
- Row selection uses `aria-selected`
- Sort buttons have `aria-sort`
- Column filters have `aria-label`
- Live region for loading/empty states

---

## Row Click Handler

```tsx
<DataTable
  onRowClick={(row) => router.push(`/invoices/${row.id}`)}
  columns={columns}
  data={data}
  rowKey={(r) => r.id}
/>
```

- Clicking non-interactive area of row triggers
- Does not trigger if clicking action menu, checkbox, or edit cell

---

## Complete Advanced Example

```tsx
export function AdvancedInvoicesTable() {
  const [data, setData] = useState<Invoice[]>([]);
  const url = useDataTableUrlState({
    filters: { date: 'date', status: 'multiselect' },
    sortable: ['no', 'customer', 'date', 'amount'],
  });

  const { data: serverData, meta } = useInvoicesQuery(url.query);

  return (
    <DataTable
      columns={columns}
      data={serverData ?? data}
      rowKey={(r) => r.id}
      meta={meta}
      {...url.tableProps}
      persistKey="invoices-advanced"
      rowNumbers
      selectable
      rowActions={rowActions}
      bulkActions={bulkActions}
      reorderableRows
      reorderableColumns
      onRowReorder={(e) => setData((d) => reorderById(d, e.activeId, e.overId, (x) => x.id))}
      editReason={{ presets: ['اصلاح مبلغ', 'اصلاح تاریخ'] }}
      onRowSave={async (row, patch, ctx) => {
        await api.updateInvoice(row.id, patch, { reason: ctx.reason });
        setData((d) => d.map((x) => (x.id === row.id ? { ...x, ...patch } : x)));
      }}
      exportFileName="invoices"
      summaryLabel="جمع این صفحه"
      summary={{
        amount: <span>مبلغ کل: {formatMoney(meta?.total ? 0 : 0)}</span>,
      }}
      className="h-[calc(100vh-200px)]"
    />
  );
}
```
