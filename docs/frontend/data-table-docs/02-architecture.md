# Architecture

## Layer Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          data-table.types.ts                                 │
│         Public prop/domain contracts (no React, no framework)                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌───────────────┬─────────┴─────────┬───────────────┐
          ▼               ▼                   ▼               ▼
    ┌─────────┐    ┌─────────────┐    ┌────────────┐   ┌─────────────┐
    │ columns/│    │   date/     │    │  filters/  │   │     lib/    │
    │ resolve │    │  jalali.ts  │    │ filter-fns │   │  csv, url,  │
    │columns  │    │  ISO ↔ Jalali│    │ filter-types│  │ reorder, fmt│
    └─────────┘    └─────────────┘    └────────────┘   └─────────────┘
          │               │                   │               │
          └───────────────┴─────────┬─────────┴───────────────┘
                                    ▼
                        ┌─────────────────────────┐
                        │         hooks/          │
                        │  Stateful wiring layer  │
                        │  (TanStack, DnD, dialogs)│
                        └─────────────────────────┘
                                    │
          ┌───────────────┬─────────┴─────────┬───────────────┐
          ▼               ▼                   ▼               ▼
    ┌──────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────┐
    │ TableChrome│ │  TableSurface │ │   RowView    │   │  Hooks   │
    │ Toolbar   │   │  header/body  │   │  memoized    │   │ (internal)│
    │ Filters   │   │  footer/frame │   │  row render  │   │          │
    └──────────┘   └──────────────┘   └──────────────┘   └──────────┘
          │               │                   │
          └───────────────┴─────────┬─────────┘
                                    ▼
                        ┌─────────────────────────┐
                        │      DataTable.tsx      │
                        │   Orchestrator layer    │
                        │  calls hooks + composes │
                        └─────────────────────────┘
                                    │
                                    ▼
                        ┌─────────────────────────┐
                        │        index.ts         │
                        │      Public barrel      │
                        └─────────────────────────┘
```

## Data Flow

### Client Mode

```
Data (local array)
        │
        ▼
useColumnResolve → resolved columns (ids, labels, visibility defaults)
        │
        ▼
useClientTablePipeline (TanStack Table)
        │
        ├─▶ getCoreRowModel → getFilteredRowModel → getSortedRowModel → getPaginationRowModel
        │
        ▼
useTableLayout → derived flags (hasSearch, stickyHeader, colSpan, etc.)
useTableVirtualizer → scrollRef + virtualizer (if virtualize)
        │
        ▼
RowView (memoized) receives stable callbacks from useRowCallbacks
        │
        ▼
TableSurface renders <table> + header/body/footer + DnD frame
TableChrome renders Toolbar + ActiveFilters + BulkBar + Notice
```

### Server Mode

```
URL / React Query / SWR fetch
        │
        ▼
Parent computes: page, limit, sorting, filters, search
        │
        ▼
<data={pageData} meta={meta} page={page} limit={limit}
  onPageChange={setPage} onLimitChange={setLimit}
  sorting={sorting} onSortingChange={setSorting}
  columnFilters={filters} onColumnFiltersChange={setFilters}
  search={search} onSearchChange={setSearch} />
        │
        ▼
DataTable.tsx receives controlled props
        │
        ▼
useDataTableModel → isServer = true → bypasses client pipeline
        │
        ▼
Render: TableChrome (toolbar disabled if no meta) + TableSurface
```

### Where Fetching Lives

**Outside the table.** The table is a pure UI component. Use React Query, SWR, or your fetcher in the parent:

```tsx
function InvoicesPage() {
  const url = useDataTableUrlState({ filters: { date: 'date', status: 'multiselect' } });
  const { data, meta } = useInvoicesQuery(url.query); // ← your API hook
  return <DataTable columns={columns} {...url.tableProps} data={data} meta={meta} />;
}
```

The table never fetches; it only renders what you give it.

## Folder Map

| Folder       | Responsibility                                                                                                                                                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `actions/`   | `ActionDialog`, `BulkBar`, `RowActions` — confirm/reason dialogs, bulk bar, row menu                                                                                                                                               |
| `cells/`     | `DateCell`, `MoneyCell`, `NumberCell`, `StatusCell` — formatted display cells                                                                                                                                                      |
| `columns/`   | `resolve-columns.ts`, `footers.ts`, `search.ts` — column normalization, footers, global search index                                                                                                                               |
| `date/`      | `jalali.ts`, `JalaliDateInput.tsx`, `JalaliDatePicker.tsx` — zero-dep Jalali ↔ Gregorian                                                                                                                                           |
| `dnd/`       | `dnd-layer.tsx` — lazy-loaded dnd-kit components                                                                                                                                                                                   |
| `editing/`   | `EditableCell.tsx` — shared inline editing cell                                                                                                                                                                                    |
| `filters/`   | `ColumnFilter.tsx`, `ActiveFilters.tsx`, `filter-fns.ts`, `filter-types.ts` — column filter UI + logic                                                                                                                             |
| `hooks/`     | 17 hooks — stateful wiring (see below)                                                                                                                                                                                             |
| `lib/`       | `csv.ts`, `url-state.ts`, `format.ts`, `reorder.ts`, `export.ts`, `pagination.ts`, `text.ts` — pure utilities                                                                                                                      |
| `table/`     | `TableSurface.tsx`, `TableChrome.tsx`, `RowView.tsx`, `TableHeaderRow.tsx`, `TableBodyRows.tsx`, `TableFooterRow.tsx`, `TableStateRow.tsx`, `TablePagination.tsx`, `TablePaginationSlot.tsx`, `styles.ts` — presentational modules |
| `__tests__/` | `logic.test.ts`, `jalali.test.ts` — pure logic tests                                                                                                                                                                               |

## Hook Responsibilities

| Hook                     | One-Line Responsibility                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `useDataTableModel`      | Data source, mode, toolbar defaults, column resolution, persistence, TanStack pipeline       |
| `useClientTablePipeline` | Server/client row pipeline: sorting, filtering, search, paging, row ids, view key            |
| `useColumnResolve`       | Normalizes `DataTableColumn[]` → resolved columns with ids, labels, visibility defaults      |
| `useColumnPersistence`   | Controlled/uncontrolled visibility, order, density with `persistKey` storage                 |
| `useTableLayout`         | Derived flags: empty state, DnD wants, sticky header, leading cells, colSpan, row click/edit |
| `useTableVirtualizer`    | Scroll container ref + row virtualizer (disabled unless `virtualize`)                        |
| `useRowSelection`        | Selection map, shift-range select, select-all, clears on `viewKey` change                    |
| `useInlineEdit`          | Edit draft/errors/saving, validation, reason-gated save, cancel                              |
| `useActionDialog`        | Shared confirm/reason dialog + dismissible error notice                                      |
| `useTableActions`        | Row & bulk action execution; direct vs dialog paths                                          |
| `useTableViewHandlers`   | Sort toggle, column filter set, view-change reset (page + selection)                         |
| `useTableReorder`        | dnd-kit active/over ids → public row/column reorder callbacks                                |
| `useRowCallbacks`        | Identity-stable row callbacks + table context for memoized rows                              |
| `useDataTableUrlState`   | Keeps page/limit/search/sort/filters in Next.js URL (router.replace)                         |
| `useControllableState`   | Controlled/uncontrolled helper for props like `page`, `density`                              |
| `useDebouncedCallback`   | Debounced search input handler                                                               |
| `useDndModule`           | Lazy dynamic import of dnd-kit components                                                    |

## Extension Points

| Want to…            | Touch                                                                                                      | Don't Touch                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------- |
| Add column type     | `data-table.types.ts` → `ColumnType`, `columns/resolve-columns.ts`, `cells/cells.tsx`, `table/RowView.tsx` | DataTable orchestrator      |
| Add filter type     | `filters/filter-types.ts`, `filters/filter-fns.ts`, `filters/ColumnFilter.tsx`                             | Pipeline internals          |
| Add date format     | `date/jalali.ts` (`JalaliFormat`), `resolve-columns.ts`                                                    | Direct `new Date` usage     |
| Add cell renderer   | `cells/cells.tsx` + `table/RowView.tsx`                                                                    | Hardcoded switch in RowView |
| Add export format   | `lib/export.ts` + `lib/csv.ts`                                                                             | Action dialog               |
| Change shadcn paths | `ui.ts` only                                                                                               | Scattered imports           |

## Memoization Rules

1. **Columns array must be stable** — defined outside component or via `useMemo`
2. **`rowKey` must return stable identity** — used for selection, editing, DnD
3. **`RowView` is memoized** — receives stable callbacks via `useRowCallbacks`
4. **Hook callbacks are stable** — `useRowCallbacks` wraps in ref + memo
5. **Don't inline column defs** — breaks row memoization
6. **Don't mutate row objects** — TanStack expects immutable updates

## Lazy Loading

- **DnD** → `useDndModule` dynamically imports `dnd-kit` only when `reorderableRows` or `reorderableColumns` is true
- **Virtualize** → `useTableVirtualizer` creates virtualizer only when `virtualize` is true
- **Heavy cells** → code-split at app level, not inside table

## Verification Commands

```bash
# Run tests
pnpm --filter @repo/web test

# Typecheck
cd packages/web && npx tsc --noEmit

# Format check
npx prettier --check "packages/web/ui/components/custom/ui/data-table/**/*.{ts,tsx}"

# Lint
pnpm lint
```
