# Public API

This document describes the **public API** exported from `packages/web/ui/components/custom/ui/data-table/index.ts`. Only these symbols are stable across releases.

## Main Exports

```ts
export { DataTable } from './DataTable';
export { PaginationControls } from './PaginationControls';
```

### Types

```ts
export type {
  ActionContext,
  BulkAction,
  ColumnType,
  ConfirmConfig,
  DataTableCell,
  DataTableColumn,
  DataTableProps,
  Density,
  EditableConfig,
  PaginatedResponse,
  PaginationControlsProps,
  PaginationMeta,
  ReasonConfig,
  RowAction,
  RowReorderEvent,
  StatusMap,
  StatusTone,
  ToolbarOptions,
} from './data-table.types';
```

### Utilities

```ts
export {
  DEFAULT_PAGE_SIZES,
  reorderById,
  resolvePageSizes,
  sanitizeMeta,
} from './data-table.utils';
```

### URL State

```ts
export { useDataTableUrlState } from './hooks/useDataTableUrlState';
export { parseTableState, serializeTableState } from './lib/url-state';
export type { SortItem, TableQueryState, TableUrlSchema } from './lib/url-state';
```

### Filters

```ts
export type {
  ColumnFilterConfig,
  FilterOption,
  FilterValue,
  NumberRange,
} from './filters/filter-types';
```

### Jalali Date Toolkit

```ts
export { JalaliDateInput } from './date/JalaliDateInput';
export { JalaliDatePicker } from './date/JalaliDatePicker';
export {
  DATE_PRESETS,
  addDays,
  formatJalali,
  formatRangeLabel,
  isoToJalali,
  jalaliToIso,
  parseJalaliInput,
  todayIso,
  toFaDigits,
  toEnDigits,
} from './date/jalali';
export type { IsoDate, IsoRange } from './date/jalali';
```

### Cells & Helpers

```ts
export { DateCell, MoneyCell, NumberCell, StatusCell } from './cells/cells';
export { sumFooter } from './columns/footers';
export { formatMoney, formatNumber, parseNumberInput } from './lib/format';
```

---

## DataTableProps

### Overview by Concern

| Concern       | Props                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------- |
| **Data**      | `data?`, `rows?` (deprecated), `rowKey?`                                                        |
| **Mode**      | `mode?`, `meta?`, `page?`, `limit?`, `onPageChange?`, `onLimitChange?`                          |
| **Sorting**   | `sorting?`, `onSortingChange?`                                                                  |
| **Filtering** | `columnFilters?`, `onColumnFiltersChange?`, `search?`, `onSearchChange?`                        |
| **Selection** | `selectable?`, `onSelectionChange?`                                                             |
| **Actions**   | `rowActions?`, `bulkActions?`, `onRowClick?`, `rowClassName?`                                   |
| **Editing**   | `onRowSave?`, `editReason?`, `editTrigger?`                                                     |
| **DnD**       | `reorderableRows?`, `onRowReorder?`, `reorderableColumns?`, `columnOrder?`                      |
| **View**      | `columnVisibility?`, `onColumnVisibilityChange?`, `density?`, `onDensityChange?`, `persistKey?` |
| **Layout**    | `virtualize?`, `maxHeight?`, `toolbar?`, `toolbarStart?`, `toolbarEnd?`, `exportFileName?`      |
| **States**    | `loading?`, `error?`, `searchTerm?`, `loadingMessage?`, `emptyMessage?`, `searchEmptyMessage?`  |
| **Other**     | `className?`, `aria-label?`, `rowNumbers?`, `summary?`, `summaryLabel?`                         |

### Data Props

| Prop      | Type                                   | Required                   | Description                                                         |
| --------- | -------------------------------------- | -------------------------- | ------------------------------------------------------------------- |
| `columns` | `DataTableColumn<T>[]`                 | **Yes**                    | Column definitions. Must be stable (outside component or `useMemo`) |
| `data`    | `T[]`                                  | Yes (client) / No (server) | Current page data. Prefer this over `rows`                          |
| `rows`    | `T[]`                                  | Deprecated                 | Use `data` instead                                                  |
| `rowKey`  | `(row: T, index: number) => React.Key` | **Yes**                    | Stable key extractor. Required for selection, editing, DnD          |

### Mode Props

| Prop              | Default                                        | Description                             |
| ----------------- | ---------------------------------------------- | --------------------------------------- |
| `mode`            | `'server'` if `meta` provided, else `'client'` | `'server'` = controlled via props       |
| `meta`            | —                                              | `PaginationMeta` for server mode        |
| `page`            | —                                              | Controlled page number (1-based)        |
| `limit`           | —                                              | Rows per page                           |
| `onPageChange`    | —                                              | Called when page changes                |
| `onLimitChange`   | —                                              | Called when page size changes           |
| `pageSizes`       | `[10,20,50,100]`                               | Options for page size selector          |
| `paginate`        | `true`                                         | Client mode: set false to show all rows |
| `defaultPageSize` | `20`                                           | Client mode initial page size           |

### Sorting / Filtering / Search

| Prop                    | Type                                             |
| ----------------------- | ------------------------------------------------ |
| `sorting`               | `SortItem[]`                                     |
| `onSortingChange`       | `(sorting: SortItem[]) => void`                  |
| `columnFilters`         | `Record<string, FilterValue>`                    |
| `onColumnFiltersChange` | `(filters: Record<string, FilterValue>) => void` |
| `search`                | `string`                                         |
| `onSearchChange`        | `(search: string) => void`                       |
| `searchPlaceholder`     | `string`                                         |

### Selection

| Prop                | Type                                        | Notes                      |
| ------------------- | ------------------------------------------- | -------------------------- |
| `selectable`        | `boolean`                                   | Show checkbox column       |
| `onSelectionChange` | `(rows: T[], ids: string[]) => void`        | Called on selection change |
| **Behavior**        | Selection clears on filter/page/sort change | Intentional, via `viewKey` |

### Actions

| Prop           | Type                 |
| -------------- | -------------------- |
| `rowActions`   | `RowAction<T>[]`     |
| `bulkActions`  | `BulkAction<T>[]`    |
| `onRowClick`   | `(row: T) => void`   |
| `rowClassName` | `(row: T) => string` |

### Editing

| Prop          | Type                                                                       | Notes                           |
| ------------- | -------------------------------------------------------------------------- | ------------------------------- |
| `onRowSave`   | `(row: T, patch: Partial<T>, ctx: ActionContext) => void \| Promise<void>` | Called on save; throw to reject |
| `editReason`  | `boolean \| ReasonConfig`                                                  | Require audit reason for edits  |
| `editTrigger` | `'action' \| 'doubleClick'`                                                | How to enter edit mode          |

### DnD

| Prop                  | Type                                  | Notes                                 |
| --------------------- | ------------------------------------- | ------------------------------------- |
| `reorderableRows`     | `boolean`                             | Lazy-loaded dnd-kit                   |
| `onRowReorder`        | `(event: RowReorderEvent<T>) => void` | Receives `activeId`, `overId`, `rows` |
| `reorderableColumns`  | `boolean`                             | Lazy-loaded                           |
| `columnOrder`         | `string[]`                            | Controlled column order               |
| `onColumnOrderChange` | `(order: string[]) => void`           | Called on reorder                     |

### View

| Prop                       | Type                                            |
| -------------------------- | ----------------------------------------------- |
| `columnVisibility`         | `Record<string, boolean>`                       |
| `onColumnVisibilityChange` | `(visibility: Record<string, boolean>) => void` |
| `density`                  | `'compact' \| 'comfortable'`                    |
| `onDensityChange`          | `(density: Density) => void`                    |
| `persistKey`               | `string`                                        | Persist visibility/order/density to localStorage |

### Layout

| Prop             | Type                              |
| ---------------- | --------------------------------- |
| `virtualize`     | `boolean`                         |
| `maxHeight`      | `number \| string`                |
| `toolbar`        | `boolean \| ToolbarOptions`       |
| `toolbarStart`   | `React.ReactNode`                 |
| `toolbarEnd`     | `React.ReactNode`                 |
| `exportFileName` | `string`                          |
| `summary`        | `Record<string, React.ReactNode>` |
| `summaryLabel`   | `React.ReactNode`                 |

---

## DataTableColumn

```ts
type DataTableColumn<T> = DataTableColumnBase<T> &
  ({ key: keyof T & string; cell?: DataTableCell<T> } | { key?: string; cell: DataTableCell<T> });
```

### Fields

| Field           | Type                                                           | Default                         | Notes                                                             |
| --------------- | -------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------- |
| `id`            | `string`                                                       | `key`                           | Column id for filtering/sorting                                   |
| `header`        | `React.ReactNode`                                              | —                               | Required                                                          |
| `label`         | `string`                                                       | `header` as string              | For menus/filters/CSV                                             |
| `type`          | `ColumnType`                                                   | `'text'`                        | `'text' \| 'number' \| 'money' \| 'date' \| 'status' \| 'custom'` |
| `align`         | `'start' \| 'center' \| 'end'`                                 | Type-based                      |                                                                   |
| `sortable`      | `boolean \| ((a,b) => number)`                                 | `!!key && type !== 'custom'`    |                                                                   |
| `sortDescFirst` | `boolean`                                                      | `false`                         | First click sorts desc                                            |
| `filter`        | `boolean \| ColumnFilterConfig`                                | `type`-based                    |                                                                   |
| `clickToFilter` | `boolean`                                                      | `type === 'date' \|\| 'status'` | Click cell to filter                                              |
| `editable`      | `boolean \| EditableConfig<T>`                                 | `false`                         | Inline editing                                                    |
| `status`        | `StatusMap`                                                    | —                               | For `type: 'status'`                                              |
| `dateFormat`    | `JalaliFormat`                                                 | `'numeric'`                     | For `type: 'date'`                                                |
| `currency`      | `string`                                                       | —                               | Shown in header for money                                         |
| `hideable`      | `boolean`                                                      | `true`                          | Column visibility menu                                            |
| `defaultHidden` | `boolean`                                                      | `false`                         | Initially hidden                                                  |
| `reorderable`   | `boolean`                                                      | `true`                          | Can be dragged                                                    |
| `searchable`    | `boolean`                                                      | `true`                          | Included in global search                                         |
| `searchText`    | `(row: T) => string`                                           | —                               | Extra searchable text                                             |
| `footer`        | `(rows: T[]) => React.ReactNode`                               | —                               | Footer for current page                                           |
| `exportValue`   | `(row: T) => string \| number \| boolean \| null \| undefined` | —                               | CSV export value                                                  |

---

## RowAction & BulkAction

### RowAction<T>

```ts
{
  id: string;                        // required
  label: string;                     // required
  icon?: React.ReactNode;
  kind?: 'edit';                     // starts inline edit (no onSelect needed)
  variant?: 'default' | 'destructive';
  inline?: boolean;                  // show as icon button next to row, not in menu
  hidden?: (row: T) => boolean;
  disabled?: (row: T) => boolean | string;
  confirm?: {
    title: string;
    description?: React.ReactNode | ((subject: T) => React.ReactNode);
    confirmLabel?: string;
  };
  reason?: boolean | ReasonConfig;
  onSelect?: (row: T, ctx: ActionContext) => void | Promise<void>;
}
```

### BulkAction<T>

```ts
{
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

### ReasonConfig

```ts
{
  required?: boolean;        // default true
  label?: string;            // custom label
  placeholder?: string;      // input placeholder
  minLength?: number;        // minimum length
  presets?: string[];        // one-tap reasons
}
```

---

## PaginationMeta

```ts
{
  page: number; // current page (1-based)
  limit: number; // rows per page
  total: number; // total rows
  totalPages: number; // total pages
}
```

---

## Deprecated

| Old                               | New            | Notes                                                            |
| --------------------------------- | -------------- | ---------------------------------------------------------------- |
| `rows`                            | `data`         | `rows` still works but use `data`                                |
| `column.footer` for server totals | `summary` prop | Server totals go in `summary`, client totals use `column.footer` |

---

## Publicly Exported Types

See the full list in `index.ts`. Never import types from internal files — use the barrel export.

All public API is covered by `DataTable`, `PaginationControls`, `useDataTableUrlState`, and the exported types listed above.
