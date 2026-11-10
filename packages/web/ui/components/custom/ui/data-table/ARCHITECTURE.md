# Data Table Architecture

## Layers

```
data-table.types.ts        public prop/domain contracts (no React, no framework)
        │
lib/  columns/  date/  filters/   pure helpers: URL codec, CSV, Jalali, column resolution, filter fns
        │
hooks/                      stateful wiring (TanStack, selection, DnD, dialogs, editing)
        │
table/                      presentational modules (header, rows, body states, footer, chrome, surface)
        │
DataTable.tsx               orchestrator: calls hooks, composes <TableChrome> + <TableSurface>
        │
index.ts                    the only public barrel
```

`TableParts.tsx` no longer exists; its code lives in `table/` and its shared types in `data-table.types.ts`.

## File responsibilities

| File                              | Responsibility                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `DataTable.tsx`                   | Wires hooks and composes chrome/surface/dialog. No table markup or state logic.                                          |
| `hooks/useDataTableModel.ts`      | Data source, mode, toolbar defaults, column resolution, visibility/order/density, TanStack pipeline.                     |
| `hooks/useClientTablePipeline.ts` | Server/client row pipeline: sorting, filtering, search, paging, row ids, view key.                                       |
| `hooks/useColumnResolve.ts`       | Normalizes `DataTableColumn[]` into resolved columns, ids, labels, visibility defaults.                                  |
| `hooks/useColumnPersistence.ts`   | Controlled/uncontrolled visibility, order, and density, with `persistKey` storage.                                       |
| `hooks/useTableLayout.ts`         | Derived flags: search/filters empty state, DnD wants, sticky header, leading cells, colSpan, loading/error/empty states. |
| `hooks/useTableVirtualizer.ts`    | Scroll container ref + row virtualizer, disabled unless `virtualize`.                                                    |
| `hooks/useRowSelection.ts`        | Selection map, shift-range select, select-all, clears when `viewKey` changes.                                            |
| `hooks/useInlineEdit.ts`          | Edit draft/errors/saving, validation, reason-gated save, cancel.                                                         |
| `hooks/useActionDialog.ts`        | Shared confirm/reason dialog plus the dismissible error notice.                                                          |
| `hooks/useTableActions.ts`        | Row and bulk action execution; direct vs dialog paths.                                                                   |
| `hooks/useTableViewHandlers.ts`   | Sort toggle, column filter set, view-change reset (page + selection).                                                    |
| `hooks/useTableReorder.ts`        | dnd-kit active/over ids → public row/column reorder callbacks.                                                           |
| `hooks/useRowCallbacks.ts`        | Identity-stable row callbacks + table context for memoized rows.                                                         |
| `table/TableSurface.tsx`          | `<table>`, header/body/footer, scroll frame, lazy DnD root, pagination slot.                                             |
| `table/TableChrome.tsx`           | Toolbar, active filters, bulk bar, error notice.                                                                         |
| `table/RowView.tsx`               | Memoized row: selection, inline edit, actions, display cells.                                                            |
| `lib/export.ts`                   | Pure CSV row building from resolved columns (raw Gregorian values).                                                      |

## Rules

- **Public API:** export new public symbols only from `index.ts`. Internal files may move freely.
- **UI primitives:** import shadcn components only through `ui.ts`; never directly from shadcn paths.
- **Date contract:** UI is Jalali, data/URL/API/CSV are Gregorian ISO. Never parse `YYYY-MM-DD` with `new Date(...)`; use `date/jalali.ts`.
- **DnD:** always optional and lazy through `useDndModule`; never import dnd-kit eagerly.
- **Selection:** clears on page, filter, search, or sort changes via `viewKey`; don't bypass `useRowSelection`.
- **Memoization:** do not break `RowView` memo or `useRowCallbacks`; new row props must be stable or primitive.
- **Money/dates:** use `Money`/`Decimal`/`BusinessDate` at call sites; the table only formats primitives.

## Where to add things

- **New column type:** extend `ColumnType` + `ResolvedColumn` in `data-table.types.ts`, resolve it in `columns/resolve-columns.ts`, render it in `cells/cells.tsx` and `table/RowView.tsx`, filter/export it if relevant.
- **New filter type:** add to `filters/filter-types.ts` + `filters/filter-fns.ts`, render controls in `filters/ColumnFilter.tsx`; pipeline consumes it automatically.
- **Expandable rows:** extend `RowView` (or add a row-detail row variant) and pass the expansion state through `TableSurface`; keep row ids stable.
- **Selection change behavior:** change `useRowSelection`/`useTableViewHandlers` only; do not add ad-hoc clearing in components.

## Verification

```
pnpm --filter @repo/web test
cd packages/web && npx tsc --noEmit
npx prettier --check "packages/web/ui/components/custom/ui/data-table/**/*.{ts,tsx}"
```
