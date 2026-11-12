# Date Contract

> **Non-negotiable.** This is the single most important rule in the table. Violate it and you get off-by-one date bugs, timezone drift, and broken filters.

---

## The Rule

| Layer                                  | Format                  | Example                       |
| -------------------------------------- | ----------------------- | ----------------------------- |
| **UI (display, input, picker)**        | Jalali (Persian)        | `۱۴۰۵/۰۷/۲۷` or `۲۷ مهر ۱۴۰۵` |
| **Data (props, state, API, URL, CSV)** | Gregorian ISO date-only | `2026-10-19`                  |

> **Data never leaves Gregorian ISO.** The table handles conversion at the UI boundary only.

---

## Why This Matters

```tsx
// ❌ WRONG — timezone drift, off-by-one on midnight
const d = new Date('2026-10-19');
const jalali = someLib.toJalali(d);

// ✅ CORRECT — integer arithmetic, no timezone
const jalali = isoToJalali('2026-10-19'); // { jy: 1405, jm: 7, jd: 27 }
```

`new Date('YYYY-MM-DD')` parses as **UTC midnight**. In Tehran (+3:30), that's **the previous evening**. Every date-only value becomes a time value → bugs at DST boundaries, midnight, and when the server timezone differs.

---

## The Helpers (Use These)

All helpers live in `packages/web/ui/components/custom/ui/data-table/date/jalali.ts`:

| Helper                            | Purpose                                                      |
| --------------------------------- | ------------------------------------------------------------ |
| `isoToJalali(iso)`                | `2026-10-19` → `{ jy: 1405, jm: 7, jd: 27 }`                 |
| `jalaliToIso(jy, jm, jd)`         | `{ jy: 1405, jm: 7, jd: 27 }` → `2026-10-19`                 |
| `formatJalali(iso, opts?)`        | `2026-10-19` → `۱۴۰۵/۰۷/۲۷` (numeric) / `۲۷ مهر ۱۴۰۵` (long) |
| `parseJalaliInput(text)`          | User input `۱۴۰۵/۰۷/۲۷` → `2026-10-19` (Gregorian ISO)       |
| `addDays(iso, n)`                 | Add/subtract days safely (UTC arithmetic)                    |
| `todayIso()`                      | `2026-10-19` — local today as ISO                            |
| `isoToJalali`, `jalaliToIso`      | Core conversions, no timezone                                |
| `compareIso(a, b)`                | Lexicographic ISO string comparison                          |
| `toFaDigits(n)` / `toEnDigits(s)` | Digit conversion                                             |

### Format Options

```ts
formatJalali('2026-10-19', { format: 'numeric' }); // ۱۴۰۵/۰۷/۲۷
formatJalali('2026-10-19', { format: 'short' }); // ۲۷ مهر
formatJalali('2026-10-19', { format: 'long' }); // ۲۷ مهر ۱۴۰۵
formatJalali('2026-10-19', { weekday: true }); // جمعه ۲۷ مهر ۱۴۰۵
formatJalali('2026-10-19', { latinDigits: true }); // 1405/07/27
```

### Parsing User Input

```tsx
// User types: "1405/07/27" or "۱۴۰۵/۰۷/۲۷" or "1405-07-27" or "۱۴۰۵۰۷۲۷"
parseJalaliInput('1405/07/27'); // '2026-10-19'
parseJalaliInput('۱۴۰۵/۰۷/۲۷'); // '2026-10-19'
parseJalaliInput('14050727'); // '2026-10-19'
parseJalaliInput('invalid'); // null
```

---

## Where This Applies

| Area                                   | Format                                 | Code Location                      |
| -------------------------------------- | -------------------------------------- | ---------------------------------- |
| Column `type: 'date'` display          | Jalali via `DateCell`                  | `cells/cells.tsx` → `formatJalali` |
| Date column filter                     | Gregorian ISO range `{ from, to }`     | `filters/filter-fns.ts`            |
| URL query params (`f.date`)            | Gregorian ISO `2026-10-17..2026-10-23` | `lib/url-state.ts`                 |
| `columnFilters` state                  | Gregorian ISO range                    | `useClientTablePipeline`           |
| CSV export (`type: 'date'`)            | Gregorian ISO `2026-10-19`             | `lib/export.ts` → `getRaw`         |
| `JalaliDateInput` / `JalaliDatePicker` | UI: Jalali, Value: Gregorian ISO       | `date/JalaliDateInput.tsx`         |
| `addDays`, `todayIso`                  | Gregorian ISO arithmetic               | `date/jalali.ts`                   |

---

## Common Mistakes

### ❌ Parsing ISO with `new Date`

```ts
// WRONG
const d = new Date('2026-10-19'); // UTC midnight → 2026-10-18 20:30 in Tehran

// CORRECT
const parts = parseIso('2026-10-19'); // [2026, 10, 19] — pure integers
const jalali = isoToJalali('2026-10-19');
```

### ❌ Comparing Jalali strings lexicographically

```ts
// WRONG — '۱۴۰۵/۱۲/۰۱' < '۱۴۰۵/۷/۲۷' lexicographically
if (jalaliA < jalaliB) ...

// CORRECT — compare Gregorian ISO
if (isoA < isoB) ...
// or use compareIso(a, b)
```

### ❌ Storing Jalali in database/API

```ts
// WRONG
await api.save({ date: '۱۴۰۵/۰۷/۲۷' });

// CORRECT
await api.save({ date: '2026-10-19' });
```

### ❌ Using `Date` for date-only arithmetic

```ts
// WRONG — DST bug
const tomorrow = new Date(date.getTime() + 86400000);

// CORRECT — integer arithmetic in UTC
const tomorrow = addDays(iso, 1);
```

---

## Quick Reference: Input → Output

| You Have                      | You Want                  | Use                                 |
| ----------------------------- | ------------------------- | ----------------------------------- |
| User input `۱۴۰۵/۰۷/۲۷`       | ISO for API               | `parseJalaliInput(input)`           |
| ISO `2026-10-19`              | Display `۱۴۰۵/۰۷/۲۷`      | `formatJalali(iso)`                 |
| ISO `2026-10-19`              | Jalali parts `{jy,jm,jd}` | `isoToJalali(iso)`                  |
| Jalali `{jy:1405,jm:7,jd:27}` | ISO for DB                | `jalaliToIso(jy,jm,jd)`             |
| ISO `2026-10-19`              | +7 days                   | `addDays(iso, 7)`                   |
| ISO `2026-10-19`              | Today?                    | `compareIso(iso, todayIso()) === 0` |

---

## Testing the Contract

```bash
# Run Jalali tests
pnpm --filter @repo/web test -- __tests__/jalali.test.ts
```

Tests cover: round-trip ISO ↔ Jalali, edge cases (leap years, month boundaries), parsing variants, digit conversion, presets.
