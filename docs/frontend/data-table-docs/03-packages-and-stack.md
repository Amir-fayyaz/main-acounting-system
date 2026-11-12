# Packages & Stack

## Direct Dependencies

### `@tanstack/react-table@^8.21.3`

**Why:** Headless table logic — sorting, filtering, pagination, row models. Chosen over AG Grid (too heavy) and vanilla TanStack Table v7 (no virtualization support). Pinned because v8.22+ changed internal APIs.

**What we use:**

- `useReactTable` with `getCoreRowModel`, `getFilteredRowModel`, `getSortedRowModel`, `getPaginationRowModel`
- Column definitions via `createColumnHelper` pattern
- Row model: `pageRows`, `getPrePaginationRowModel`

**Bundle impact:** ~18KB gzipped (core only). Features like grouping, pivot, row expansion are **not** bundled.

---

### `@tanstack/react-virtual@3.19.x`

**Why:** Windowed rendering for 5,000+ rows without pagination. Chosen because it's the TanStack sibling — same mental model, same quality.

**What we use:**

- `useVirtualizer` with fixed `estimateSize` (37px compact / 53px comfortable)
- `measureElement` for row height measurement
- `getVirtualItems` for rendering window

**Bundle impact:** ~4KB gzipped. Only loaded when `virtualize={true}`.

---

### `@dnd-kit/core@^6.1.0` + `@dnd-kit/sortable@^8.0.0`

**Why:** Drag-and-drop for row reorder and column reorder. Chosen over react-beautiful-dnd (unmaintained) and react-dnd (complex API). dnd-kit is modular, accessible, and works with SSR/Next.js.

**What we use:**

- `DndContext`, `closestCenter` collision detection
- `SortableContext`, `verticalListSortingStrategy`, `horizontalListSortingStrategy`
- `KeyboardSensor`, `PointerSensor`, `TouchSensor`
- `useSensor`, `useSensors`

**Lazy loading:** Only loaded when `reorderableRows` or `reorderableColumns` is true via `useDndModule`.

**Bundle impact:** ~12KB gzipped (core + sortable). **Not loaded** unless DnD is enabled.

---

### `lucide-react@^0.4xx`

**Why:** Icon library — tree-shakeable, consistent stroke style, RTL-friendly.

**What we use:** `ArrowUp`, `ArrowDown`, `ChevronsUpDown`, `Eye`, `Copy`, `Printer`, `Trash2`, `Ban`, `Search`, `Filter`, `Columns`, `Density`, `Download`, `X`, `ChevronLeft`, `ChevronRight`.

**Bundle impact:** Only imported icons are included (~500B per icon gzipped).

---

### `date-fns` — **NOT USED**

Jalali calendar is **zero-dependency** (`date/jalali.ts`). No moment, no date-fns, no jalali-moment. All date math uses integer arithmetic (no `new Date('YYYY-MM-DD')`).

---

## UI Primitives — `ui.ts` Adaptation Layer

All shadcn/ui primitives are imported through a single barrel:

```ts
// packages/web/ui/components/custom/ui/data-table/ui.ts
export {
  Button,
  Checkbox,
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  Badge,
  Separator,
  ScrollArea,
  ScrollBar,
} from '@/ui';
```

**Why:** Single point to swap shadcn versions, add RTL tweaks, or replace with a different UI library without touching table internals.

**Rule:** Never import `@/ui/*` directly inside the table package. Import from `./ui`.

---

## Internal Utilities (Zero-Dep)

| File                | Purpose                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `lib/csv.ts`        | BOM + RFC4180 CSV with formula-injection guard (`'=...` → `'=...`) |
| `lib/url-state.ts`  | Pure URL ↔ table-state codec (sort, filter, page, limit, search)   |
| `lib/format.ts`     | `formatMoney`, `formatNumber`, `parseNumberInput` (Persian digits) |
| `lib/reorder.ts`    | `reorderById` — immutable array move by id                         |
| `lib/export.ts`     | `buildCsv` — pure CSV row building from resolved columns           |
| `lib/pagination.ts` | `resolvePaginationMeta` — server/client page meta resolution       |
| `lib/text.ts`       | `compareText`, `normalizeFa`, `cx` (clsx-like)                     |
| `lib/url-state.ts`  | URL codec (see [08-usage-url-state.md](./08-usage-url-state.md))   |

---

## Why Not These?

| Alternative                        | Reason                                                                            |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| AG Grid                            | 500KB+, enterprise license for advanced features, overkill for accounting screens |
| TanStack Table v7                  | No virtualization, no column sizing API                                           |
| react-beautiful-dnd                | Unmaintained, no SSR support, no touch                                            |
| react-dnd                          | Complex backend system, steep learning curve                                      |
| moment-jalali / jalali-moment      | Heavy, mutates Date, timezone bugs                                                |
| date-fns-jalali                    | Adds 50KB for calendar only                                                       |
| @tanstack/react-table built-in CSV | No formula guard, no custom exportValue                                           |

---

## Bundle Size Estimates

| Feature Set                                | Est. gzipped |
| ------------------------------------------ | ------------ |
| Base table (client, no DnD, no virtualize) | ~25KB        |
| + Row/Column DnD                           | +12KB (lazy) |
| + Virtualize                               | +4KB (lazy)  |
| Full feature set (all lazy loaded)         | ~41KB        |

All heavy features are **opt-in and lazy-loaded** — base bundle stays small.

---

## Version Pinning

| Package                   | Version   | Policy                       |
| ------------------------- | --------- | ---------------------------- |
| `@tanstack/react-table`   | `^8.21.3` | Minor only; major = breaking |
| `@tanstack/react-virtual` | `^3.19.x` | Minor only                   |
| `@dnd-kit/core`           | `^6.1.0`  | Minor only                   |
| `@dnd-kit/sortable`       | `^8.0.0`  | Minor only                   |
| `lucide-react`            | `^0.4xx`  | Patch only (icon additions)  |

**Never** upgrade major versions without a migration plan and full test run. See `package.json` for exact ranges.
