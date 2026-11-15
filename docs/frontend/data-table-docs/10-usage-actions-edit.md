# Row Actions, Bulk Actions, Inline Editing

This document covers all action types, confirm dialogs, reason prompts, and inline editing patterns.

---

## Row Actions

Row actions appear in a dropdown menu per row (or as inline icon buttons with `inline: true`).

### Basic Row Action

```tsx
const rowActions = useMemo<RowAction<Invoice>[]>(
  () => [
    {
      id: 'view',
      label: 'مشاهده',
      icon: <Eye className="size-4" />,
      onSelect: (row) => router.push(`/invoices/${row.id}`),
    },
    {
      id: 'copy',
      label: 'کپی فاکتور',
      icon: <Copy className="size-4" />,
      onSelect: (row) => copyInvoice(row.id),
    },
  ],
  [],
);
```

### Edit Action

```tsx
{
  id: 'edit',
  kind: 'edit',           // special kind — starts inline editing
  label: 'ویرایش سریع',
  inline: true,           // show as icon button next to row, not in menu
  disabled: (r) => r.status === 'void' ? 'فاکتور باطل‌شده قابل ویرایش نیست' : false,
}
```

- `kind: 'edit'` requires no `onSelect` — starts inline edit
- `inline: true` → renders as icon button in actions column (not in dropdown)
- `disabled` can return `boolean` or `string` (shown as tooltip)

### Action with Confirm Dialog

```tsx
{
  id: 'void',
  label: 'ابطال فاکتور',
  icon: <Ban className="size-4" />,
  variant: 'destructive',
  hidden: (r) => r.status === 'void',
  confirm: {
    title: 'ابطال فاکتور',
    description: (r) => `فاکتور ${r.no} باطل می‌شود و سند حسابداری آن برگشت می‌خورد.`,
    confirmLabel: 'ابطال',
  },
  reason: { presets: ['اشتباه در ثبت', 'درخواست مشتری', 'فاکتور تکراری'], minLength: 5 },
  onSelect: async (r) => {
    await api.voidInvoice(r.id);
    setData(d => d.map(x => x.id === r.id ? { ...x, status: 'void' } : x));
  },
}
```

### ConfirmConfig

```ts
interface ConfirmConfig<Subject> {
  title: string;
  description?: React.ReactNode | ((subject: Subject) => React.ReactNode);
  confirmLabel?: string; // default: 'تأیید'
}
```

- `description` can be a string/element or a function receiving the row/subject
- `confirmLabel` customizes the confirm button text

### ReasonConfig

```ts
interface ReasonConfig {
  required?: boolean; // default: true
  label?: string; // custom label
  placeholder?: string; // input placeholder
  minLength?: number; // minimum length
  presets?: string[]; // one-tap reason chips
}
```

```tsx
reason: {
  required: true,
  label: 'دلیل ابطال',
  placeholder: 'دلیل را بنویسید...',
  minLength: 5,
  presets: ['اشتباه در ثبت', 'درخواست مشتری', 'فاکتور تکراری'],
}
```

- `presets` render as chips above the text area
- User can select a preset or type custom reason
- Reason is passed to `onSelect` via `ActionContext`

### ActionContext

```ts
interface ActionContext {
  reason?: string;
}
```

```tsx
onSelect: async (row, ctx) => {
  await api.deleteInvoice(row.id, { reason: ctx.reason });
  // ctx.reason is the user-provided reason string
};
```

---

## Bulk Actions

Bulk actions appear in a bar when `selectable` is true and rows are selected.

```tsx
const bulkActions = useMemo<BulkAction<Invoice>[]>(
  () => [
    {
      id: 'bulk-delete',
      label: 'حذف انتخاب‌شده‌ها',
      variant: 'destructive',
      reason: true,
      onSelect: async (rows) => {
        await api.bulkDelete(rows.map((r) => r.id));
        setData((d) => d.filter((x) => !rows.some((r) => r.id === x.id)));
      },
    },
    {
      id: 'bulk-export',
      label: 'خروجی انتخاب‌شده‌ها',
      icon: <Download className="size-4" />,
      onSelect: (rows) => exportSelected(rows),
    },
  ],
  [],
);
```

### BulkAction<T>

```ts
interface BulkAction<T> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive';
  disabled?: (rows: T[]) => boolean;
  confirm?: ConfirmConfig<T[]>;
  reason?: boolean | ReasonConfig;
  onSelect: (rows: T[], ctx: ActionContext) => void | Promise<void>;
}
```

- `rows` is array of full row objects
- `confirm.description` receives the array of rows
- `reason` applies to the entire batch

### Bulk Action with Confirm

```tsx
{
  id: 'bulk-void',
  label: 'ابطال گروهی',
  variant: 'destructive',
  confirm: {
    title: 'ابطال فاکتورهای انتخاب‌شده',
    description: (rows) => `${rows.length} فاکتور باطل می‌شود. این عمل برگشت‌پذیر نیست.`,
    confirmLabel: 'ابطال همه',
  },
  reason: { required: true, presets: ['اشتباه', 'لغو'] },
  onSelect: async (rows) => {
    await api.bulkVoid(rows.map(r => r.id));
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  },
}
```

---

## Inline Editing

Inline editing lets users edit row cells directly in the table.

### Enable Editing

```tsx
<DataTable
  columns={columns}
  data={data}
  rowKey={(r) => r.id}
  onRowSave={async (row, patch) => {
    await api.updateInvoice(row.id, patch);
    setData((d) => d.map((x) => (x.id === row.id ? { ...x, ...patch } : x)));
  }}
  editReason={{ label: 'دلیل ویرایش', presets: ['اصلاح مبلغ', 'اصلاح تاریخ'] }}
/>
```

### Column-Level Editing

```tsx
const columns: DataTableColumn<Invoice>[] = [
  { key: 'customer', header: 'مشتری', editable: true },
  {
    key: 'amount',
    header: 'مبلغ',
    type: 'money',
    editable: {
      required: true,
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

### Edit Triggers

```tsx
<DataTable
  editTrigger="action"        // default: 'edit' row action or double-click
  editTrigger="doubleClick"   // enter edit on row double-click
  onRowSave={...}
/>
```

- `'action'` → click `kind: 'edit'` action (default)
- `'doubleClick'` → double-click row to edit

### onRowSave

```tsx
onRowSave: async (row: T, patch: Partial<T>, ctx: ActionContext) => {
  // patch contains only changed fields
  // ctx.reason contains edit reason if editReason is enabled
  await api.updateInvoice(row.id, patch);
  // Update local state or invalidate query
  setData((d) => d.map((x) => (x.id === row.id ? { ...x, ...patch } : x)));
};
```

### Validation

```tsx
editable: {
  required: true,
  validate: (value, draft, row) => {
    if (value === '') return 'این فیلد الزامی است';
    if (Number(value) <= 0) return 'مبلغ باید بزرگ‌تر از صفر باشد';
    if (draft.discount > row.amount) return 'تخفیف نمی‌تواند از مبلغ اصلی بیشتر باشد';
    return undefined; // valid
  },
}
```

- `validate` receives `(value, draft, row)`
- Return `string` to show error and block save
- Return `undefined` or nothing for valid

### Per-Row Disable

```tsx
{
  key: 'amount',
  header: 'مبلغ',
  type: 'money',
  editable: {
    disabled: (row) => row.status === 'void' || row.status === 'paid',
  },
}
```

### Edit Reason

```tsx
<DataTable
  editReason={{
    required: true,
    label: 'دلیل ویرایش',
    presets: ['اصلاح مبلغ', 'اصلاح تاریخ', 'تصحیح مشتری'],
    minLength: 3,
  }}
/>
```

When `editReason` is enabled, saving an edit requires a reason (same UI as actions).

### onRowSave with Reason

```tsx
onRowSave: async (row, patch, ctx) => {
  await api.updateInvoice(row.id, patch, { reason: ctx.reason });
  setData((d) => d.map((x) => (x.id === row.id ? { ...x, ...patch } : x)));
};
```

### Complete Example

```tsx
const columns: DataTableColumn<Invoice>[] = [
  { key: 'no', header: 'شماره', sortable: true },
  { key: 'customer', header: 'مشتری', editable: { required: true } },
  { key: 'date', header: 'تاریخ', type: 'date', editable: { required: true } },
  {
    key: 'amount',
    header: 'مبلغ',
    type: 'money',
    currency: 'ریال',
    editable: {
      required: true,
      validate: (v) => (Number(v) <= 0 ? 'مبلغ باید بزرگ‌تر از صفر باشد' : undefined),
    },
  },
  { key: 'status', header: 'وضعیت', type: 'status', status: STATUS, editable: true },
];

const rowActions = useMemo<RowAction<Invoice>[]>(() => [
  {
    id: 'edit',
    kind: 'edit',
    label: 'ویرایش',
    inline: true,
    disabled: (r) => r.status === 'void' ? 'فاکتور باطل شده قابل ویرایش نیست' : false,
  },
  { id: 'void', label: 'ابطال', variant: 'destructive', reason: true, onSelect: ... },
], []);

<DataTable
  columns={columns}
  data={data}
  rowKey={(r) => r.id}
  rowActions={rowActions}
  onRowSave={async (row, patch, ctx) => {
    await api.updateInvoice(row.id, patch, { reason: ctx.reason });
    setData(d => d.map(x => x.id === row.id ? { ...x, ...patch } : x));
  }}
  editReason={{ presets: ['اصلاح مبلغ', 'اصلاح تاریخ'] }}
  editTrigger="doubleClick"
/>
```

---

## Disabled / Hidden Actions

```tsx
{
  id: 'delete',
  label: 'حذف',
  variant: 'destructive',
  hidden: (r) => r.status === 'void',          // don't show at all
  disabled: (r) => r.locked ? 'این فاکتور قفل شده' : false,
  confirm: { title: 'حذف؟', description: 'قابل بازگشت نیست' },
  onSelect: (r) => { ... },
}
```

- `hidden`: completely removes from menu/button
- `disabled`: shows but disabled; if string, shown as tooltip

---

## Action Icons

```tsx
import { Edit, Trash2, Eye, Copy, Printer, Ban, Download } from 'lucide-react';

{
  id: 'edit',
  label: 'ویرایش',
  icon: <Edit className="size-4" />,
  kind: 'edit',
}
```

Icons are rendered at `size-4` (16px) by default.

---

## Complete Action Patterns

### Delete with Reason + Confirm

```tsx
{
  id: 'delete',
  label: 'حذف',
  variant: 'destructive',
  icon: <Trash2 className="size-4" />,
  confirm: {
    title: 'حذف فاکتور',
    description: 'این عمل قابل بازگشت نیست.',
  },
  reason: { required: true, presets: ['اشتباه', 'لغو'] },
  onSelect: async (row) => {
    await api.deleteInvoice(row.id);
    setData(d => d.filter(x => x.id !== row.id));
  },
}
```

### View Only

```tsx
{
  id: 'view',
  label: 'مشاهده',
  icon: <Eye className="size-4" />,
  onSelect: (row) => router.push(`/invoices/${row.id}`),
}
```

### Print with Custom Confirm

```tsx
{
  id: 'print',
  label: 'چاپ',
  icon: <Printer className="size-4" />,
  confirm: {
    title: 'چاپ فاکتور',
    description: (r) => `آیا فاکتور ${r.no} چاپ شود؟`,
    confirmLabel: 'چاپ',
  },
  onSelect: () => window.print(),
}
```

---

## Complete Bulk Action Patterns

### Bulk Delete

```tsx
{
  id: 'bulk-delete',
  label: 'حذف انتخاب‌شده‌ها',
  variant: 'destructive',
  reason: { required: true, presets: ['اشتباه', 'لغو'] },
  onSelect: async (rows) => {
    await api.bulkDelete(rows.map(r => r.id));
    setData(d => d.filter(x => !rows.some(r => r.id === x.id)));
  },
}
```

### Bulk Status Change

```tsx
{
  id: 'bulk-mark-paid',
  label: 'علامت‌گذاری پرداخت‌شده',
  icon: <Check className="size-4" />,
  confirm: {
    title: 'تأیید پرداخت گروهی',
    description: (rows) => `${rows.length} فاکتور به وضعیت «پرداخت‌شده» تغییر وضعیت می‌دهند.`,
  },
  reason: { presets: ['وصول نقدی', 'وصول چک', 'انتقال بانکی'] },
  onSelect: async (rows) => {
    await api.bulkMarkPaid(rows.map(r => r.id));
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  },
}
```

### Bulk Export

```tsx
{
  id: 'bulk-export',
  label: 'خروجی انتخاب‌شده‌ها',
  icon: <Download className="size-4" />,
  onSelect: (rows) => {
    const csv = buildCsv(columns, rows.map(r => ({ original: r })));
    downloadCsv('invoices-selected', csv);
  },
}
```
