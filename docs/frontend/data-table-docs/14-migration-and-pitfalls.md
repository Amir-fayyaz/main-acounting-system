# Migration & Pitfalls

## Backward Compatibility

### v1 → v2 API

| v1 Prop                           | v2 Equivalent     | Status                          |
| --------------------------------- | ----------------- | ------------------------------- |
| `rows`                            | `data`            | `rows` still works (deprecated) |
| `column.footer` for server totals | `summary` prop    | Use `summary` for server totals |
| `onRowClick` in row               | `onRowClick` prop | Same                            |
| `column.filter = true`            | Same              | Works                           |
| `column.editable = true`          | Same              | Works                           |

### Migration Checklist

- [ ] Replace `rows` with `data` in all calls
- [ ] Move server totals from `column.footer` to `summary` prop
- [ ] Ensure `rowKey` is provided (was optional, now required for features)
- [ ] Check `useDataTableUrlState` schema matches column ids
- [ ] Verify `persistKey` is unique per table instance

---

## Common Pitfalls

### 1. Unstable Columns Array

```tsx
// ❌ WRONG — new array every render → breaks row memoization
<DataTable columns={[{ key: 'id', header: 'ID' }]} data={data} rowKey={(r) => r.id} />;

// ✅ CORRECT — stable reference
const columns = useMemo(() => [{ key: 'id', header: 'ID' }], []);
<DataTable columns={columns} data={data} rowKey={(r) => r.id} />;

// ✅ ALSO CORRECT — defined outside component
const columns = [{ key: 'id', header: 'ID' }];
<DataTable columns={columns} data={data} rowKey={(r) => r.id} />;
```

**Why:** TanStack Table uses column identity to track state. New array = new columns = reset state.

### 2. Missing or Unstable `rowKey`

```tsx
// ❌ WRONG — no rowKey or unstable
<DataTable columns={columns} data={data} />

// ❌ WRONG — index-based (breaks on sort/filter)
<DataTable columns={columns} data={data} rowKey={(r, i) => i} />

// ✅ CORRECT — stable DB id
<DataTable columns={columns} data={data} rowKey={(r) => r.id} />
```

**Why:** Selection, inline editing, DnD all rely on stable row identity. Index changes on sort/filter.

### 3. Using `new Date('YYYY-MM-DD')` for Date-Only Values

```ts
// ❌ WRONG — timezone drift
const d = new Date('2026-10-19');
const jalali = toJalali(d);

// ✅ CORRECT — integer arithmetic
const jalali = isoToJalali('2026-10-19');
const tomorrow = addDays('2026-10-19', 1);
```

**Why:** `new Date('2026-10-19')` is UTC midnight. In Tehran (+3:30) it's the previous evening.

### 4. Expecting CSV to Export All Server Rows

```tsx
// ❌ WRONG in server mode
<DataTable data={pageData} meta={meta} exportFileName="all" />
// Exports only current page!

// ✅ CORRECT — separate export endpoint
<DataTable
  toolbar={{ export: false }}
  toolbarEnd={
    <Button onClick={() => api.exportAllToCsv(filters)}>
      خروجی کامل
    </Button>
  }
/>
```

**Why:** Table only has current page data. Full export needs API call.

### 5. Expecting Selection to Persist Across Filter/Page/Sort Changes

```tsx
// Selection ALWAYS clears on:
- Page change
- Filter change
- Sort change
- Search change

// This is intentional! Selection is tied to viewKey.
```

**Why:** Prevents accidental bulk operations on stale/incorrect selections.

### 6. Enabling Row DnD with Virtualize or Active Sort

```tsx
// ❌ WRONG — DnD disabled automatically
<DataTable
  virtualize
  reorderableRows
  maxHeight={500}
/>

// ✅ CORRECT — choose one
<DataTable
  reorderableRows
  paginate={false}
  // no virtualize
/>
```

**Why:** DnK can't measure virtualized rows; sort changes indices during drag.

### 7. Inline Column Definitions Breaking Memoization

```tsx
// ❌ WRONG
function Table() {
  const columns = [
    { key: 'id', header: 'ID', editable: { validate: v => ... } },
  ];
  return <DataTable columns={columns} data={data} rowKey={r => r.id} />;
}

// ✅ CORRECT — outside or useMemo
const columns = useMemo(() => [
  { key: 'id', header: 'ID', editable: { validate: v => ... } },
], []);
```

### 8. Not Providing `rowKey` for Editing/DnD/Selection

```tsx
// These features require rowKey:
selectable
rowActions={{ kind: 'edit' }}
onRowSave={...}
reorderableRows
reorderableColumns
```

### 9. Unstable Action/Action Config Arrays

```tsx
// ❌ WRONG — new array every render
<DataTable rowActions={[{ id: 'a', label: 'A', onSelect: ... }]} />

// ✅ CORRECT
const rowActions = useMemo(() => [{ id: 'a', label: 'A', onSelect: ... }], []);
```

### 10. Expecting Bulk Actions to Work Without Selection

```tsx
// Must enable selectable:
<DataTable selectable bulkActions={bulkActions} ... />
```

---

## Debugging Checklist

| Symptom                              | Likely Cause                       | Fix                                       |
| ------------------------------------ | ---------------------------------- | ----------------------------------------- |
| Rows re-render on every keystroke    | Unstable columns or `rowKey`       | Stabilize columns, add `rowKey`           |
| Selection lost after filter          | Expected behavior                  | Use `onSelectionChange` to track          |
| CSV export empty / current page only | Server mode                        | Use API endpoint for full export          |
| DnD not working                      | `virtualize` or `sorting` active   | Disable virtualize or sort for DnD        |
| Date off by one day                  | `new Date('YYYY-MM-DD')`           | Use `isoToJalali` / `addDays`             |
| Sort not working                     | `sortable: false` or no `key`      | Ensure `sortable: true` and `key` set     |
| Filter not appearing                 | `filter: false` or wrong `type`    | Check column `filter` config              |
| Edit not saving                      | `onRowSave` not provided or throws | Add `onRowSave`, handle errors            |
| Column reorder not persisting        | Missing `persistKey`               | Add `persistKey`                          |
| URL not updating                     | `useDataTableUrlState` not used    | Wrap page with hook + spread `tableProps` |

---

## TypeScript Errors

| Error                                                  | Meaning                     | Fix                                        |
| ------------------------------------------------------ | --------------------------- | ------------------------------------------ |
| `Property 'id' does not exist on type 'T'`             | `rowKey` returns wrong type | Ensure `rowKey` returns `string \| number` |
| `Type 'string' is not assignable to type 'ColumnType'` | Invalid column type         | Use valid `ColumnType`                     |
| `Argument of type 'SortItem[]' is not assignable`      | Wrong sort type             | Use `SortItem[]` from `lib/url-state`      |
| `filter` type error                                    | Mismatched filter config    | Match `ColumnFilterConfig` shape           |

---

## Performance Tips

| Tip                               | Impact                  |
| --------------------------------- | ----------------------- |
| Define columns outside component  | Prevents row re-renders |
| Use `useMemo` for actions/columns | Stable references       |
| `virtualize` for 1000+ rows       | Avoids DOM bloat        |
| `paginate={false}` + `virtualize` | Smooth scrolling        |
| Server mode for 10,000+ rows      | Browser memory          |
| `keepPreviousData` in React Query | Smooth page transitions |

---

## Version-Specific Notes

### v2 (Current)

- `data` preferred over `rows`
- `summary` for server totals
- `useDataTableUrlState` for URL sync
- `persistKey` for localStorage
- `editReason` for audit trail
- `exportFileName` for CSV

### v1 (Legacy)

- `rows` prop
- `column.footer` for server totals
- Manual URL sync
- No `persistKey`
- No `editReason`
- No CSV export prop

Both APIs work — v1 props are deprecated but functional.
