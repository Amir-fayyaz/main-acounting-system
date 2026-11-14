# Testing

## Test Structure

```
packages/web/ui/components/custom/ui/data-table/
├── __tests__/
│   ├── jalali.test.ts      # Date contract tests
│   └── logic.test.ts       # Pure logic tests (URL, CSV, columns, filters)
├── DataTable.stories.tsx   # Visual/integration examples (Storybook)
```

## Running Tests

```bash
# All tests
pnpm --filter @repo/web test

# Specific test file
pnpm --filter @repo/web test -- __tests__/jalali.test.ts
pnpm --filter @repo/web test -- __tests__/logic.test.ts

# Watch mode
pnpm --filter @repo/web test -- --watch
```

## What Is Tested

### `jalali.test.ts` — Date Contract

- ISO ↔ Jalali round-trip
- Leap year handling (1380, 1384, 1393, 1403, 1404)
- Month boundaries (31/30/29 days)
- Parsing: Persian/Arabic/Latin digits, `/ - . ٫ ،` separators
- Two-digit year interpretation (14xx)
- `addDays` across month/year boundaries
- `todayIso`, `compareIso`
- Digit conversion `toFaDigits` / `toEnDigits`
- Formatting: numeric, short, long, weekday
- Presets: today, yesterday, last 7/30, this week/month/year

### `logic.test.ts` — Pure Logic

| Area       | Tests                                                               |
| ---------- | ------------------------------------------------------------------- |
| URL codec  | Round-trip, defaults omitted, junk ignored, sort allow-list, limits |
| Filters    | dateRange, multiselect, numberRange, textContains                   |
| Text utils | `compareText`, `normalizeFa`                                        |
| Format     | `formatMoney`, `maskMoneyTyping`, `parseNumberInput`                |
| CSV        | BOM, quoting, formula-injection guard, negative numbers             |
| Columns    | Resolution defaults, filter types, editable configs, clickToFilter  |
| Search     | Jalali date text, Persian digits, AND semantics, cache              |
| Reorder    | `reorderById` moves inside list, handles missing ids                |

---

## What Is NOT Tested

| Area                      | Reason                                      |
| ------------------------- | ------------------------------------------- |
| React component rendering | No React Testing Library / JSDOM in package |
| Hook interactions         | Requires React context, tanstack table      |
| DnD interactions          | Lazy-loaded, browser-only                   |
| Virtualization            | Requires window/measure                     |
| Accessibility             | Manual/Storybook only                       |
| Visual regression         | Storybook + Chromatic (separate)            |

---

## Adding Tests

### For New Filter Type

```ts
// __tests__/logic.test.ts
import { createCustomRangeFilter } from '../filters/filter-fns';

test('custom-range filter', () => {
  const filter = createCustomRangeFilter();
  assert.ok(filter({ date: '2026-10-15' }, 'date', { start: '2026-10-01', end: '2026-10-31' }));
  assert.ok(!filter({ date: '2026-09-01' }, 'date', { start: '2026-10-01', end: '2026-10-31' }));
  assert.ok(!filter({ date: '2026-11-01' }, 'date', { start: '2026-10-01', end: '2026-10-31' }));
});
```

### For New Column Type

```ts
test('rating column resolution', () => {
  const cols = resolveColumns<{ rating: number }>([
    { key: 'rating', header: 'امتیاز', type: 'rating' },
  ]);
  assert.equal(cols[0].type, 'rating');
  assert.equal(cols[0].filter?.type, 'number');
  assert.equal(cols[0].align, 'center');
});
```

### For URL Codec Changes

```ts
test('custom-range URL round-trip', () => {
  const schema = { filters: { rating: 'custom-range' } };
  const params = new URLSearchParams('f.rating=3..5');
  const state = parseTableState(params, schema);
  assert.deepEqual(state.filters.rating, { start: '3', end: '5' });

  const serialized = serializeTableState(state, new URLSearchParams(), schema);
  assert.equal(serialized.get('f.rating'), '3..5');
});
```

---

## Test Utilities

### Test Data Helpers

```ts
// In logic.test.ts
const row = (v: unknown) => ({ getValue: () => v });
```

### Assertions

```ts
import assert from 'node:assert/strict';
// assert.equal, assert.deepEqual, assert.ok, assert.match
```

---

## Continuous Integration

Tests run in CI on every PR:

```yaml
# .github/workflows/ci.yml (example)
- name: Test web package
  run: pnpm --filter @repo/web test
- name: Typecheck web
  run: cd packages/web && npx tsc --noEmit
- name: Format check
  run: npx prettier --check "packages/web/ui/components/custom/ui/data-table/**/*.{ts,tsx}"
```

---

## Debugging Test Failures

```bash
# Verbose output
pnpm --filter @repo/web test -- --reporter=verbose

# Single test
pnpm --filter @repo/web test -- --test-name-pattern="csv"

# Typecheck only
cd packages/web && npx tsc --noEmit
```

---

## What to Test When Changing

| Change            | Add Tests For                                   |
| ----------------- | ----------------------------------------------- |
| New filter type   | filter function, URL codec, ColumnFilter UI     |
| New column type   | resolveColumns, renderDisplay, export, editable |
| Date helpers      | round-trip, edge cases (leap, boundaries)       |
| URL codec         | new filter type, sort allow-list, limits        |
| CSV export        | new column type, exportValue, formula guard     |
| Reorder           | edge cases (missing id, boundary moves)         |
| Column resolution | new type defaults, filter/editable config       |
