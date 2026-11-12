# Overview

## Purpose

The `data-table` package provides a production-ready, accounting-oriented data table for the monorepo's web apps. It combines headless table logic with opinionated features for financial workflows: Jalali date display, money formatting, audit reasons, inline editing with validation, and URL-driven state.

The table is **not** a generic UI library — it's tailored for invoicing, ledger, treasury, and inventory screens where data integrity, audit trails, and Persian UI are non-negotiable.

## Goals

1. **Predictable data contract** — UI is Jalali, data/URL/API/CSV are Gregorian ISO
2. **Server and client modes** — controlled for APIs, uncontrolled for local arrays
3. **Deep-linkable state** — URL encodes page, sort, filters, search
4. **Memo-safe** — `RowView` is memoized; stable props prevent re-renders
5. **Audit-ready** — reason prompts for destructive actions and edits
6. **Accessible and RTL** — Persian digits, logical Tailwind properties
7. **Opt-in features** — DnD, virtualize, selection, editing are all optional

## Non-Goals

- Spreadsheet-style cell navigation or formulas
- Millions of rows client-side (use server mode + pagination)
- Tree/expandable rows (out of scope today)
- Custom rendering frameworks beyond React
- Automatic data fetching — React Query/SWR lives outside the table

## Feature List

### Core

- Client or server pagination
- Multi-column sorts (Shift+click)
- Global search + per-column filters
- Column visibility, reorder, density controls
- RTL support, Persian digits, Jalali dates
- CSV export (current page, Gregorian dates)

### Opt-In

- Row selection + bulk actions with reason prompts
- Row actions with confirm dialogs and audit reasons
- Inline row editing with async save + validation
- Row & column drag-and-drop (lazy loaded)
- Windowed rendering via TanStack Virtual
- Column/visibility/order/density persistence via `persistKey`
- Summary footers per column or server-provided

### Data Integrity

- Row key required for selection/editing/DnD
- Selection clears on filter/page/sort change
- DnD disabled during active sort or inline edit
- CSV exports raw values, not formatted display

## Key Constraints

| Must                            | Why                                                              |
| ------------------------------- | ---------------------------------------------------------------- |
| `rowKey` is required            | Selection, editing, DnD rely on stable identity                  |
| Columns array must be stable    | Defined outside component or via `useMemo` to keep rows memoized |
| Dates in data are Gregorian ISO | `YYYY-MM-DD` — UI converts to Jalali via `date/jalali.ts`        |
| Never `new Date('YYYY-MM-DD')`  | Timezone drift; use integer arithmetic helpers                   |

## Quick Comparison

| Feature         | Client Mode      | Server Mode                            |
| --------------- | ---------------- | -------------------------------------- |
| Data source     | Local array      | Fetched via props                      |
| Sorting         | In-browser       | API-controlled                         |
| Filtering       | In-browser       | API-controlled                         |
| Pagination      | In-browser       | API-controlled                         |
| URL sync        | Optional         | Recommended via `useDataTableUrlState` |
| Selection reset | On view change   | On view change                         |
| CSV export      | Full client data | Current page only                      |
| Virtualize      | Yes              | No benefit                             |

See [06-usage-client.md](./06-usage-client.md) and [07-usage-server.md](./07-usage-server.md) for patterns.
