# Data Table Documentation

The canonical reference for the `data-table` package — an accounting-oriented, feature-rich React table component built for the monorepo.

---

## What is this?

`@repo/web/ui/components/custom/ui/data-table` is a **React table component** designed for accounting and financial applications in the monorepo. It combines:

- **TanStack Table v8** for headless table logic (sorting, filtering, pagination)
- **TanStack Virtual** for windowed rendering
- **dnd-kit** for drag-and-drop row/column reordering
- **Zero-dependency Jalali calendar** for Persian UI with Gregorian ISO data
- **shadcn/ui** primitives through a single adaptation layer

### When to use it

✅ **Use this table when you need:**

- Multi-column sorting, column filters, global search
- Server-side or client-side pagination
- Row selection + bulk actions
- Inline editing with validation + audit reasons
- Row & column drag-and-drop reordering
- Column visibility, density, and order persistence
- Virtualized rendering for large datasets
- URL-driven state (deep-linkable filters/sorts/pages)
- CSV export with Gregorian dates / raw numbers
- RTL / Persian-first UI with proper number formatting

### When NOT to use it

❌ **Don't use this table when you need:**

- Full spreadsheet editing (cell navigation, formulas, undo stack)
- Millions of rows with server-side virtualization (use a dedicated grid like AG Grid)
- Tree/expandable rows (not yet supported)
- Pivot tables or OLAP-style grouping
- Client-side Excel import/export

---

## Quick Start

```tsx
import { DataTable } from '@/ui/components/custom/ui/data-table';
import type { DataTableColumn } from '@/ui/components/custom/ui/data-table';

interface Invoice {
  id: string;
  no: string;
  customer: string;
  date: string; // Gregorian ISO "2026-10-19"
  amount: number;
  status: 'paid' | 'unpaid';
}

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

---

## Documentation Index

| File                                                           | Description                                             |
| -------------------------------------------------------------- | ------------------------------------------------------- |
| [01-overview.md](./01-overview.md)                             | Purpose, goals, non-goals, feature list                 |
| [02-architecture.md](./02-architecture.md)                     | Layers, data flow, folder map, extension points         |
| [03-packages-and-stack.md](./03-packages-and-stack.md)         | Dependencies, why each, bundle notes, `ui.ts`           |
| [04-date-contract.md](./04-date-contract.md)                   | **Critical:** Jalali UI / Gregorian ISO data contract   |
| [05-public-api.md](./05-public-api.md)                         | Exports, props, column definition reference             |
| [06-usage-client.md](./06-usage-client.md)                     | Client-mode examples                                    |
| [07-usage-server.md](./07-usage-server.md)                     | Server-mode + React Query patterns                      |
| [08-usage-url-state.md](./08-usage-url-state.md)               | `useDataTableUrlState`, query shape, URL examples       |
| [09-usage-columns.md](./09-usage-columns.md)                   | Column types, filters, sort, footer, editable           |
| [10-usage-actions-edit.md](./10-usage-actions-edit.md)         | Row actions, bulk actions, confirm, reason, inline edit |
| [11-usage-advanced.md](./11-usage-advanced.md)                 | DnD, virtualize, persistKey, selection rules, CSV       |
| [12-extending.md](./12-extending.md)                           | How to add filter/column types safely                   |
| [13-testing.md](./13-testing.md)                               | Test organization, how to run, what to add              |
| [14-migration-and-pitfalls.md](./14-migration-and-pitfalls.md) | Common mistakes, backward compatibility                 |

---

## Links

- **Stories:** `packages/web/ui/components/custom/ui/data-table/DataTable.stories.tsx`
- **Source:** `packages/web/ui/components/custom/ui/data-table/`
- **Architecture (internal):** `packages/web/ui/components/custom/ui/data-table/ARCHITECTURE.md`

---

## Version Compatibility

| Package                   | Version Policy                                                                |
| ------------------------- | ----------------------------------------------------------------------------- |
| `@tanstack/react-table`   | Pinned `^8.21.3` — see [03-packages-and-stack.md](./03-packages-and-stack.md) |
| `@tanstack/react-virtual` | Latest compatible with React Table v8                                         |
| `dnd-kit`                 | Core + sortable only, lazy-loaded                                             |
| `lucide-react`            | Icons only, tree-shaken                                                       |

This table is **not** a drop-in replacement for AG Grid or TanStack Table alone — it's an opinionated composition tuned for accounting workflows in this monorepo.
