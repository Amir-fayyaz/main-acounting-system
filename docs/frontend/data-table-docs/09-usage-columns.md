# Column Types, Filters, Sort, Footer, Editable

This document covers all column features with copy-pasteable examples.

## Column Definition Reference

```tsx
type DataTableColumn<T> = DataTableColumnBase<T> &
  ({ key: keyof T & string; cell?: DataTableCell<T> } | { key?: string; cell: DataTableCell<T> });
```

Every column **must** have either `key` (for automatic value extraction) or `cell` (custom renderer).

---

## Column Types

| Type     | Display                       | Filter Default | Sort          | Edit Default | Export               |
| -------- | ----------------------------- | -------------- | ------------- | ------------ | -------------------- |
| `text`   | Raw string                    | Text filter    | String        | Text         | String               |
| `number` | Formatted with Persian digits | Number range   | Numeric       | Number       | Raw number           |
| `money`  | `formatMoney` + currency hint | Number range   | Numeric       | Money        | Raw number           |
| `date`   | `formatJalali` (Jalali)       | Date range     | Lexicographic | Date         | Gregorian ISO        |
| `status` | Badge with tone               | Multiselect    | Status order  | Select       | Status label         |
| `custom` | `cell` function only          | None           | None          | None         | `exportValue` or raw |

---

## Text Columns

```tsx
const columns: DataTableColumn<Invoice>[] = [
  { key: 'no', header: 'شماره', sortable: true, filter: { type: 'text' } },
  { key: 'customer', header: 'مشتری', filter: true, editable: { required: true } },
];
```

- `filter: true` → auto text filter
- `filter: { type: 'text' }` → explicit
- `filter: false` → disable

---

## Number Columns

```tsx
{ key: 'quantity', header: 'تعداد', type: 'number', align: 'end' },
```

- Formatted with Persian digits in UI
- Sorted numerically
- Filter: number range
- Export: raw number

---

## Money Columns

```tsx
{ key: 'amount', header: 'مبلغ', type: 'money', currency: 'ریال', sortDescFirst: true },
```

- Formatted with `formatMoney` + Persian digits
- Currency shown in header as `(ریال)`
- `sortDescFirst: true` → first click sorts highest first
- Export: raw number (e.g., `1234500`)

---

## Date Columns

```tsx
{ key: 'date', header: 'تاریخ', type: 'date', sortDescFirst: true },
{ key: 'due', header: 'سررسید', type: 'date', dateFormat: 'short', defaultHidden: true },
```

| Option          | Values                           | Default                                |
| --------------- | -------------------------------- | -------------------------------------- |
| `dateFormat`    | `'numeric' \| 'short' \| 'long'` | `'numeric'`                            |
| `clickToFilter` | `true` (default for date)        | Click cell value to filter by that day |

**Data format:** Gregorian ISO `YYYY-MM-DD`  
**UI format:** Jalali via `formatJalali` (numeric: `۱۴۰۵/۰۷/۲۷`, short: `۲۷ مهر`, long: `۲۷ مهر ۱۴۰۵`)  
**Filter:** Date range `{ from: '2026-10-01', to: '2026-10-31 }`  
**Sort:** Lexicographic on ISO string (works for chronological order)  
**Export:** Gregorian ISO

---

## Status Columns

```tsx
const STATUS = {
  paid: { label: 'پرداخت‌شده', tone: 'success' },
  partial: { label: 'پرداخت جزئی', tone: 'warning' },
  unpaid: { label: 'باقی‌مانده', tone: 'danger' },
  void: { label: 'باطل‌شده', tone: 'neutral' },
} as const;

{ key: 'status', header: 'وضعیت', type: 'status', status: STATUS },
```

| Tone      | Visual       |
| --------- | ------------ |
| `success` | Green badge  |
| `warning` | Yellow/amber |
| `danger`  | Red          |
| `info`    | Blue         |
| `neutral` | Gray         |

**Filter:** Multiselect with status labels  
**Sort:** By status order in `StatusMap` (first = lowest)  
**Click to filter:** Click badge to filter by that status  
**Export:** Status label (e.g., `پرداخت‌شده`)

---

## Custom Cell Renderer

```tsx
{
  key: 'amount',
  header: 'مبلغ',
  type: 'money',
  currency: 'ریال',
  cell: (row, index) => (
    <span className="font-mono tabular-nums">
      {formatMoney(row.amount)}
      {row.discount > 0 && (
        <span className="ml-2 text-xs text-muted-foreground">
          -{formatMoney(row.discount)}
        </span>
      )}
    </span>
  ),
}
```

- `cell` receives `(row: T, index: number)` → `React.ReactNode`
- Use when display logic differs from `type` default
- If `key` is also provided, `key` is used for sorting/filtering/export

---

## Editable Columns

```tsx
const columns = [
  { key: 'customer', header: 'مشتری', editable: true },
  {
    key: 'amount',
    header: 'مبلغ',
    type: 'money',
    currency: 'ریال',
    editable: {
      required: true,
      type: 'money',
      validate: (v) => (Number(v) <= 0 ? 'مبلغ باید بزرگ‌تر از صفر باشد' : undefined),
    },
  },
  {
    key: 'status',
    header: 'وضعیت',
    type: 'status',
    status: STATUS,
    editable: {
      type: 'select',
      options: [
        { value: 'paid', label: 'پرداخت‌شده' },
        { value: 'partial', label: 'پرداخت جزئی' },
        { value: 'unpaid', label: 'باقی‌مانده' },
      ],
    },
  },
];
```

### EditableConfig

```ts
interface EditableConfig<T> {
  type?: 'text' | 'number' | 'money' | 'date' | 'select';
  options?: FilterOption[]; // for select type
  required?: boolean; // default false
  placeholder?: string;
  validate?: (value: unknown, draft: Partial<T>, row: T) => string | undefined;
  disabled?: (row: T) => boolean; // per-row disable
}
```

- `type` defaults to column type
- `validate` runs on blur and before save — return error string to block
- `disabled` can disable editing per-row (e.g., posted journal entries)

---

## Column Filters

```tsx
// Automatic based on type:
{ key: 'customer', filter: true },              // text
{ key: 'amount', filter: true },                // number range
{ key: 'date', filter: true },                  // date range
{ key: 'status', filter: true },                // multiselect

// Custom filter config:
{ key: 'status', filter: { type: 'select' } }, // override to select
{ key: 'amount', filter: { type: 'number', label: 'مبلغ' } }, // custom label
```

### Filter Config

```ts
type ColumnFilterConfig =
  | { type: 'text'; label?: string }
  | { type: 'select'; label?: string; options?: FilterOption[] }
  | { type: 'multiselect'; label?: string; options?: FilterOption[] }
  | { type: 'date'; label?: string }
  | { type: 'number'; label?: string }
  | { type: 'multiselect'; label?: string };
```

---

## Sorting

```tsx
{ key: 'amount', sortable: true, sortDescFirst: true },
// sortDescFirst: true → first click sorts descending (useful for amounts/dates)

{ key: 'customer', sortable: (a, b) => a.customer.localeCompare(b.customer) },
// custom comparator (rarely needed)
```

- Multi-column sort: hold Shift + click column header
- Max 3 columns by default (configurable via `TableUrlSchema.maxSortColumns`)
- Sort order indicator: ① ② ③

---

## Footer / Summary

### Client Mode: Column Footer

```tsx
import { sumFooter } from '@/ui/components/custom/ui/data-table';

{ key: 'amount', header: 'مبلغ', type: 'money', footer: sumFooter<Invoice>('amount') },
{ key: 'discount', header: 'تخفیف', type: 'money', footer: sumFooter<Invoice>('discount') },
```

```tsx
// Custom footer:
{
  key: 'status',
  header: 'وضعیت',
  type: 'status',
  status: STATUS,
  footer: (rows) => `تسویه: ${rows.filter(r => r.status === 'paid').length} / ${rows.length}`,
},
```

- `footer` receives current page rows array
- Use `sumFooter<T>(key)` helper for sums
- `summaryLabel` prop sets label in leading cell

### Server Mode: Summary Prop

```tsx
<DataTable
  columns={columns}
  data={data}
  rowKey={(r) => r.id}
  meta={meta}
  {...url.tableProps}
  summary={{
    amount: <span>جمع کل: {formatMoney(totalAmount)}</span>,
    discount: <span>تخفیف کل: {formatMoney(totalDiscount)}</span>,
  }}
  summaryLabel="جمع کل"
/>
```

- `summary` keys match column `id`
- Overrides `column.footer` for server mode
- Render anything — totals, links, badges

---

## Column Visibility & Order

```tsx
<DataTable
  columns={columns}
  data={data}
  rowKey={(r) => r.id}
  columnVisibility={{ due: false, memo: true }}
  onColumnVisibilityChange={(vis) => setVis(vis)}
  columnOrder={['no', 'customer', 'amount', 'date']}
  onColumnOrderChange={(order) => setOrder(order)}
  reorderableColumns
  persistKey="invoices"
/>
```

- `columnVisibility`: controlled visibility map
- `columnOrder`: array of column ids in display order
- `persistKey`: saves to localStorage

---

## Column Width

```tsx
{ key: 'no', header: 'شماره', width: 80, minWidth: 60 },
{ key: 'memo', header: 'شرح', minWidth: 200 },
```

- `width`: fixed width (px or CSS string)
- `minWidth`: minimum when auto-sizing

---

## Searchable

```tsx
{ key: 'customer', header: 'مشتری', searchable: true },  // default true
{ key: 'memo', header: 'شرح', searchable: false },      // exclude from global search

// Add extra searchable text (e.g., status label):
{
  key: 'status',
  header: 'وضعیت',
  type: 'status',
  status: STATUS,
  searchable: true,
  searchText: (row) => STATUS[row.status]?.label ?? '',
},
```

---

## Click-to-Filter

```tsx
{ key: 'date', type: 'date', clickToFilter: true },      // default for date
{ key: 'status', type: 'status', clickToFilter: true },  // default for status
{ key: 'customer', clickToFilter: false },               // disable
```

Click a cell value to filter by that value (date → that day, status → that status).

---

## Export Value

```tsx
{
  key: 'status',
  type: 'status',
  status: STATUS,
  exportValue: (row) => STATUS[row.status]?.label ?? row.status, // export label, not key
},
```

- `exportValue` for custom CSV output
- Defaults to raw value from `key`

---

## Complete Column Example

```tsx
const columns: DataTableColumn<Invoice>[] = [
  {
    key: 'no',
    header: 'شماره',
    sortable: true,
    filter: { type: 'text' },
    className: 'font-mono text-xs',
    width: 100,
  },
  { key: 'customer', header: 'مشتری', filter: true, editable: { required: true } },
  {
    key: 'seller',
    header: 'فروشنده',
    filter: { type: 'select', options: SELLERS.map((s) => ({ value: s, label: s })) },
  },
  { key: 'date', header: 'تاریخ', type: 'date', sortDescFirst: true, editable: { required: true } },
  { key: 'due', header: 'سررسید', type: 'date', defaultHidden: true },
  {
    key: 'amount',
    header: 'مبلغ',
    type: 'money',
    currency: 'ریال',
    sortDescFirst: true,
    editable: {
      required: true,
      validate: (v) => (Number(v) <= 0 ? 'مبلغ باید بزرگ‌تر از صفر باشد' : undefined),
    },
    footer: sumFooter<Invoice>('amount'),
  },
  { key: 'discount', header: 'تخفیف', type: 'money', footer: sumFooter<Invoice>('discount') },
  { key: 'status', header: 'وضعیت', type: 'status', status: STATUS },
  { key: 'memo', header: 'شرح', editable: true, searchable: true },
];
```

---

## Column Defaults Summary

| Property        | Default                                                      |
| --------------- | ------------------------------------------------------------ |
| `type`          | `'text'`                                                     |
| `align`         | `'start'` (`'end'` for money/number)                         |
| `sortable`      | `!!key && type !== 'custom'`                                 |
| `filter`        | `true` for date/number/money/status; `false` for text/custom |
| `clickToFilter` | `true` for date/status                                       |
| `editable`      | `false`                                                      |
| `hideable`      | `true`                                                       |
| `reorderable`   | `true`                                                       |
| `searchable`    | `true`                                                       |
