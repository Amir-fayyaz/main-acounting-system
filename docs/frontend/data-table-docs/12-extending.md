# Extending the Data Table

This guide shows how to safely add new features without breaking existing behavior.

## Extension Principles

| Principle                         | Description                                                      |
| --------------------------------- | ---------------------------------------------------------------- |
| **Public API only in `index.ts`** | Internal files can move/change; never import from internal paths |
| **Shadcn via `ui.ts`**            | Never import `@/ui/*` directly in table package                  |
| **Date contract**                 | UI = Jalali, Data = Gregorian ISO                                |
| **Memo safety**                   | Don't break `RowView` memo or `useRowCallbacks`                  |
| **Lazy DnD**                      | Use `useDndModule` — never import dnd-kit eagerly                |
| **Test first**                    | Add tests for new pure logic before integrating                  |

---

## Adding a Filter Type

### Files to Touch

| File                       | Purpose                                               |
| -------------------------- | ----------------------------------------------------- |
| `filters/filter-types.ts`  | Add `FilterType`, `FilterValue`, `ColumnFilterConfig` |
| `filters/filter-fns.ts`    | Add filter function for the new type                  |
| `filters/ColumnFilter.tsx` | Render filter UI for the new type                     |
| `lib/url-state.ts`         | Add `parseFilterValue` / `stringifyFilterValue`       |
| `__tests__/logic.test.ts`  | Add tests for the new filter type                     |

### Step-by-Step

#### 1. Add to Filter Types

```ts
// filters/filter-types.ts
export type FilterType = 'text' | 'select' | 'multiselect' | 'date' | 'number' | 'custom-range';

export interface ColumnFilterConfig {
  type: FilterType;
  label?: string;
  // add type-specific options
}

export type FilterValue =
  | string
  | string[]
  | { from?: string; to?: string }
  | { min?: number; max?: number }
  | { start?: string; end?: string }; // new type
```

#### 2. Add Filter Function

```ts
// filters/filter-fns.ts
export function customRangeFilter<T>(row: T, columnId: string, value: FilterValue): boolean {
  const range = value as { start?: string; end?: string };
  const cellValue = getRaw(columnDef, row) as string;
  // implement logic
}
```

#### 3. Add URL Codec

```ts
// lib/url-state.ts
function parseFilterValue(type: FilterType, raw: string): FilterValue | undefined {
  switch (type) {
    case 'custom-range': {
      const [start, end] = raw.split('..');
      const range: { start?: string; end?: string } = {};
      if (start) range.start = start;
      if (end) range.end = end;
      return range.start || range.end ? range : undefined;
    }
    // ...
  }
}

function stringifyFilterValue(type: FilterType, value: FilterValue): string {
  switch (type) {
    case 'custom-range': {
      const r = value as { start?: string; end?: string };
      return `${r.start ?? ''}..${r.end ?? ''}`;
    }
    // ...
  }
}
```

#### 4. Render in ColumnFilter

```tsx
// filters/ColumnFilter.tsx
function CustomRangeFilter({ column, value, onChange }) {
  return (
    <div className="flex gap-2">
      <Input placeholder="شروع" value={value?.start} onChange={...} />
      <span>تا</span>
      <Input placeholder="پایان" value={value?.end} onChange={...} />
    </div>
  );
}
```

#### 5. Add Tests

```ts
// __tests__/logic.test.ts
test('custom-range filter', () => {
  const filter = createCustomRangeFilter();
  assert.ok(filter({ date: '2026-10-15' }, 'date', { start: '2026-10-01', end: '2026-10-31' }));
  assert.ok(!filter({ date: '2026-09-01' }, 'date', { start: '2026-10-01', end: '2026-10-31' }));
});
```

---

## Adding a Column Type

### Files to Touch

| File                         | Purpose                                            |
| ---------------------------- | -------------------------------------------------- |
| `data-table.types.ts`        | Add to `ColumnType` union                          |
| `columns/resolve-columns.ts` | Resolve default filter/editable/align for new type |
| `cells/cells.tsx`            | Add display cell for new type                      |
| `table/RowView.tsx`          | Render new type in row                             |
| `lib/export.ts`              | Handle export value if needed                      |
| `filters/filter-fns.ts`      | Add filter function if filterable                  |
| `editing/EditableCell.tsx`   | Add editor if editable                             |

### Step-by-Step

#### 1. Add to ColumnType

```ts
// data-table.types.ts
export type ColumnType = 'text' | 'number' | 'money' | 'date' | 'status' | 'rating';
```

#### 2. Resolve Defaults

```ts
// columns/resolve-columns.ts
function resolveFilter<T>(def, type, label) {
  switch (type) {
    case 'rating':
      return { type: 'number', label }; // or custom filter
  }
}

function resolveEditable<T>(def, type) {
  switch (type) {
    case 'rating':
      return {
        type: 'select',
        options: [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) })),
      };
  }
}
```

#### 3. Add Display Cell

```tsx
// cells/cells.tsx
export function RatingCell({ value }: { value: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`size-4 ${i < value ? 'text-yellow-500 fill-current' : 'text-muted-foreground'}`}
        />
      ))}
    </div>
  );
}
```

#### 4. Render in RowView

```tsx
// table/RowView.tsx
function renderDisplay<T>(rc: ResolvedColumn<T>, row: T) {
  switch (rc.type) {
    case 'rating':
      return <RatingCell value={getRaw(rc.def, row) as number} />;
    // ...
  }
}
```

---

## Adding Expandable Rows

Not yet implemented. To add:

1. Add `expanded` state to `EditingState` or new `ExpansionState`
2. Create `useRowExpansion` hook
3. Modify `TableBodyRows` to render detail row after each expanded row
4. Update `RowView` to show expand/collapse toggle
5. Add `onExpandChange` prop to `DataTableProps`

---

## Changing Shadcn Paths

Only touch `ui.ts`:

```ts
// packages/web/ui/components/custom/ui/data-table/ui.ts
export { Button } from '@/ui/button';
export { Checkbox } from '@/ui/checkbox';
// ...
```

All internal imports use `./ui` — no changes needed elsewhere.

---

## Mapping API Query Params

Never modify the table's internal URL codec. Instead, map at the page level:

```tsx
function InvoicesPage() {
  const url = useDataTableUrlState({ filters: { date: 'date', status: 'multiselect' } });

  // Map table URL state → API query
  const apiParams = useMemo(() => ({
    page: url.query.page,
    limit: url.query.limit,
    sort: url.query.sorting.map(s => `${s.desc ? '-' : ''}${s.id}`).join(','),
    search: url.query.search,
    date_from: url.query.filters.date?.from,
    date_to: url.query.filters.date?.to,
    status: url.query.filters.status,
  }, [url.query]);

  const { data, meta } = useInvoicesQuery(apiParams);
  // ...
}
```

The table doesn't know your API shape — map at the boundary.

---

## Definition of Done for Extensions

Before merging a new feature:

- [ ] TypeScript compiles (`pnpm typecheck`)
- [ ] All existing tests pass (`pnpm test`)
- [ ] New pure logic has unit tests (`__tests__/`)
- [ ] Story added to `DataTable.stories.tsx` demonstrating the feature
- [ ] No public API changes without version bump
- [ ] No internal imports from `./hooks`, `./lib`, `./table`, etc. in app code
- [ ] Date contract respected (ISO in, Jalali out)
- [ ] Memoization preserved (columns stable, rowKey stable)
- [ ] DnD still lazy, virtualize still opt-in

---

## Safe Patterns

| Pattern                           | Why Safe                   |
| --------------------------------- | -------------------------- |
| Columns defined outside component | Prevents row re-renders    |
| `rowKey` uses stable DB id        | Enables selection/edit/DnD |
| `useMemo` for actions             | Stable references          |
| `useDataTableUrlState` for URL    | Single source of truth     |
| React Query at page level         | Table stays pure UI        |
| Pure helpers in `lib/`            | Testable, no React deps    |
| `parseJalaliInput` for input      | Handles Persian digits     |

---

## Anti-Patterns to Avoid

| Anti-Pattern                         | Problem                    |
| ------------------------------------ | -------------------------- |
| Inline column definitions            | Breaks row memoization     |
| `new Date('YYYY-MM-DD')`             | Timezone bugs              |
| Importing `@/ui/*` in table          | Couples to shadcn          |
| Adding fetch logic to table          | Couples table to API       |
| Modifying `row` objects in place     | Breaks TanStack Table      |
| Skipping `rowKey`                    | Selection/edit/DnD broken  |
| Direct dnd-kit imports               | Forces bundle load         |
| Hardcoding filter logic in component | Not reusable, not testable |
