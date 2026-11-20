# Business Panel Structure Law (`web-business`)

**Authoritative source of truth** for page ownership, App Router paths, and feature folders.  
Four-person team · Goal: near-zero merge conflicts.

This document is **binding** for design and implementation of the panel inside `apps/web-business`.

Companion docs (read them; they do not replace this law):

- Frontend structure / monorepo layout, apps, `@repo/web`, rewrite topology
- Reusable panel — `PanelLayout` and `PanelConfiguration`
- DataTable & URL pagination — `DataTable`, `usePagination`, `SearchInput`

---

## 0. Where everything lives in the monorepo

| Concern                                        | Real path                                              | Role in this document                                  |
| ---------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| Marketing / landing                            | `apps/frontend`                                        | Out of scope                                           |
| **Auth** (login / register / session / cookie) | `apps/frontend` → `core/features/auth` + `app/(auth)/` | **Complete — not owned or duplicated in web-business** |
| Panel preview (demo)                           | `apps/frontend` → `app/(panel)/`                       | Demo only; not the product                             |
| **Business panel (this document)**             | `apps/web-business`                                    | Browser path: `/business/*`                            |
| Platform admin panel                           | `apps/web-admin`                                       | Out of scope                                           |
| Domain-free UI                                 | `packages/web` (`@repo/web`)                           | Shared kernel                                          |
| Domain panel features                          | `apps/web-business/src/core/features/<name>/`          | Vertical ownership for the 4-person team               |

### Auth is not in this document

1. Sign-in happens only on `apps/frontend` at `/login`. The `Token` cookie is httpOnly on the same origin.
2. The gateway rewrites `/business/*` to `web-business`; the cookie is sent automatically.
3. Inside `web-business`:
   - Do **not** build login / register forms
   - At most: read session, redirect to `/login`, show the user name in the `PanelLayout` account slot
4. Nobody moves or copies `features/auth` into `web-business`.  
   (If only `useSignOut` is needed for a logout control, use the existing frontend session contract; do not create a new auth feature.)

### `packages/web` — what may and may not live there

Per package ADRs/TECH: only things that are **truly domain-agnostic**.

| Allowed in `@repo/web`                                   | Required in `apps/web-business/core/features/...`                                    |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `PanelLayout`, sidebar, account slot                     | Journal page, cheque form, fiscal wizard                                             |
| `DataTable`, `PaginationControls`, `usePagination`       | Column defs for invoice / cheque / period lists                                      |
| `SearchInput`                                            | Period status / Sayad validation logic                                               |
| shadcn, Typography, Modal, SectionLayout, PagesContainer | Zod schemas for invoice / journal / period forms                                     |
| `cn()`, pagination helpers                               | Each feature’s `*-api.ts`                                                            |
| Anything with no product business meaning                | Anything that understands periods, Sayad IDs, commission, trial balance, branches, … |

Current shared layout (repo reality, abbreviated):

```
packages/web/ui/
├── components/
│   ├── custom/
│   │   ├── panel/     # PanelLayout, PanelHeader, PanelSidebar, account, search, …
│   │   └── ui/        # data-table, search-input, modal, sidebar, typography, wrapper, error, image
│   └── shadcn/ui/     # badge, button, card, dialog, table, tabs, …
├── utils/             # cn.ts, pagination.ts
├── index.ts
├── panel.ts           # → @repo/web/ui/panel
└── sidebar.ts         # → @repo/web/ui/sidebar
```

New shared components → small PR in `packages/web` first, then consume from the feature.

### `/business` path prefix

Inside the `web-business` app, routes start at `/`. The browser sees `/business/...`.  
`homeHref` and all nav `href`s must be decided **once** by person **A** in the first shell PR  
(either always prefix `/business`, or configure `basePath`). After that, nobody changes hrefs except A.

---

## 1. Non-negotiable rules

1. **Vertical ownership**  
   Each feature owns 100% of:
   - `app/(panel)/<route>/**`
   - `core/features/<feature>/**`  
     No files may be created or edited inside another feature’s folder without a PR and the owner’s review.

2. **Thin routes**  
   `page.tsx` only imports and renders. No state, fetch, validation, or table column defs in the route file.

3. **Public API only via the feature `index.ts`**

   ```ts
   // correct
   import { JournalPage } from '@/core/features/journal';
   // forbidden
   import { JournalTable } from '@/core/features/journal/components/block/...';
   ```

4. **`panel` and `shared` are locked**  
   Only person A (or explicit lead coordination) may change them.

5. **Branch naming**  
   `feat/<feature>-<work>`  
   Examples: `feat/journal-table` · `feat/checks-sayadi` · `feat/fiscal-periods-close-dialog`

6. **One PR = one feature** (unless the lead approves a tiny cross-cutting change such as a single nav item).

7. **No accounting rules in the client**  
   Trial balance, period close, commission, Sayad rules as business law come from the API; the UI only presents and validates forms.

---

## 2. Four-person ownership (default law)

| Person | Role             | Full ownership of paths and features                                                                                                  | Forbidden                 |
| ------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| **A**  | Platform / Shell | `panel` · `shared` · `dashboard` · `reports` · `layout.tsx` · `panel.css` · `navigation.ts`                                           | Features owned by B/C/D   |
| **B**  | Fiscal & Journal | `fiscal-periods` (years + setup under same feature) · `journal` · `trial`                                                             | Treasury / sales / org    |
| **C**  | Treasury         | `accounts` · `checks` · `pos` · (if needed `payments` · `reconciliation`)                                                             | Fiscal / journal / sales  |
| **D**  | Commerce & Org   | `sales` · `purchases` · `people` · `branches` · `users` · `staff` · `access` · `audit` · `settings` · `tenants` · (if needed `store`) | Fiscal / treasury / panel |

> Feature folder name = ownership name. If disk has `checks` (not `cheques`), keep it. If disk has `sales` (not `invoices`), keep it.

### One-liner for team chat pin

```
A = panel + shared + dashboard + reports
B = fiscal-periods + journal + trial
C = accounts + checks + pos
D = sales + purchases + people + branches + users + staff + access + audit + settings + tenants
```

---

## 2.1 Team mode 2+2 — Tenant group and Fiscal group

This section does **not** replace section 2. Labels A / B / C / D and the full page → feature map in section 3 stay **unchanged**.

When the lead announces “sprint is on 2+2 mode”, the same four roles pair into **two groups of two** for daily coordination, review boundaries, and priority — not for sharing folders.

### Fixed principle

| Layer                             | What stays fixed                                 | What changes only in 2+2                                             |
| --------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------- |
| File ownership (sections 2 and 3) | Every page keeps the same owner A or B or C or D | No page is moved or removed                                          |
| Org grouping                      | —                                                | Two people form one “group” for coordination and sprint priority     |
| Write rights on disk              | Same “full ownership” column as section 2        | The other group must not open PRs on your files (unless lead agrees) |

```
Tenant group  (2 people) = D + A
Fiscal group  (2 people) = B + C
```

### Role mapping inside groups (no page reassignment)

| Code  | 2+2 group  | Role inside group                | Same write scope as section 2 (unchanged)                                                                                                                |
| ----- | ---------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D** | **Tenant** | Tenant / org core                | `tenants` · `staff` · `access` · `users` · `branches` · `audit` · `settings` · and if activated `sales` / `purchases` / `people` / `store` per section 3 |
| **A** | **Tenant** | App shell and shared surface     | `panel` · `shared` · `dashboard` · `reports` · `navigation.ts` · `layout.tsx` · `panel.css`                                                              |
| **B** | **Fiscal** | Fiscal periods and journals core | `fiscal-periods` (periods + years + setup) · `journal` · `trial`                                                                                         |
| **C** | **Fiscal** | Treasury next to periods         | `accounts` · `checks` · `pos` · if needed `payments` / `reconciliation`                                                                                  |

### Hard boundary between groups

| Group            | May write                                          | Must not write (without cross-group PR + lead OK)                                                                |
| ---------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Tenant (D+A)** | Only features and routes in the D and A rows above | `fiscal-periods` · `journal` · `trial` · `accounts` · `checks` · `pos`                                           |
| **Fiscal (B+C)** | Only features and routes in the B and C rows above | `tenants` · `staff` · `access` · `users` · `branches` · `audit` · `settings` · `panel` / `navigation` (except A) |

- `navigation.ts` remains **A only**. The Fiscal group requests nav items via ticket/PR to A; they do not edit the file themselves.
- Technical dependencies stay as in section 7: e.g. `journal` may only read from the **public API** of `fiscal-periods` whether posting is allowed — no deep imports.

### MVP design pages under each group (same rows as section 3, group label only)

For work scope and the “implementation scope” column, always use section 3. Here is the group rollup only:

**Tenant group — designs and paths**

| MVP design                                                              | Path                         | Role inside group                   |
| ----------------------------------------------------------------------- | ---------------------------- | ----------------------------------- |
| —                                                                       | `/tenants` and nested routes | D                                   |
| —                                                                       | `/staff` · `/access`         | D                                   |
| `users.html`                                                            | `/users`                     | D                                   |
| `branches.html`                                                         | `/branches`                  | D                                   |
| `audit.html`                                                            | `/audit`                     | D                                   |
| `settings.html`                                                         | `/settings`                  | D                                   |
| `dashboard.html`                                                        | `/`                          | A                                   |
| `reports.html`                                                          | `/reports`                   | A                                   |
| `people.html` · `invoices.html` · `new-invoice.html` · `purchases.html` | per section 3                | D — only if unfrozen for the sprint |

**Fiscal group — designs and paths**

| MVP design                          | Path                        | Role inside group |
| ----------------------------------- | --------------------------- | ----------------- |
| `fiscal-periods.html`               | `/fiscal-periods`           | B                 |
| `fiscal-years.html`                 | `/fiscal-years`             | B                 |
| `fiscal-setup.html`                 | `/fiscal-setup`             | B                 |
| `journal.html` · `new-journal.html` | `/journal` · `/journal/new` | B                 |
| `trial.html`                        | `/trial`                    | B                 |
| `accounts.html`                     | `/accounts`                 | C                 |
| `cheques.html`                      | `/checks`                   | C                 |
| `pos.html`                          | `/pos`                      | C                 |

### Principled work split inside each pair

Goal: the two people in a group do not collide on the same folder; each pulls vertical work on their own features.

| Group  | Person | Suggested priority order                                                                                       | How the other person in the pair helps                              |
| ------ | ------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Tenant | **D**  | `tenants` (list, detail, memberships) → `staff` / `access` → `users` / `branches`                              | Review D’s PRs; do not edit D’s files                               |
| Tenant | **A**  | Stable `navigation` + `layout` → `dashboard` → `reports`; queue nav PRs from both groups                       | Review shell; optional integrated nav tests with Tenant pages       |
| Fiscal | **B**  | `fiscal-setup` wizard → `fiscal-periods` (close/reopen) → `fiscal-years` → `journal` / `new-journal` → `trial` | Review B’s PRs; keep period-status public API stable                |
| Fiscal | **C**  | `checks` (Sayad, due date) → `accounts` → `pos`                                                                | Review C’s PRs; align with B only on “posting only in open periods” |

Inside a group, each person still has their A/B/C/D boundary. “Group” means sprint coordination and priority, not shared ownership of one folder.

### Sales and purchases in 2+2 mode

Section 2 and 3 ownership for `sales` / `purchases` / `people` / `store` remains **D**. In a 2+2 sprint:

1. **Default:** those features are **frozen** — Placeholder only; no new PRs without lead announcement.
2. **If the lead activates them:** **D** does the work (same Tenant group); record one line in the sprint note: “commerce unfrozen”.

No page moves from D to B or C unless this document is formally amended.

### Which sprint mode is active?

| Mode                                 | Lead announcement      | Meaning                                                            |
| ------------------------------------ | ---------------------- | ------------------------------------------------------------------ |
| **Four parallel owners (section 2)** | “Mode A∥B∥C∥D”         | All four roles work their scopes in parallel; commerce may proceed |
| **2+2 (this section)**               | “Mode Tenant + Fiscal” | Focus on the two groups above; commerce frozen by default          |

Only **one** mode is active per sprint. Day-to-day page references still use codes A/B/C/D and section 3 so the page-distribution structure never breaks.

---

## 3. Exact map: MVP design → route → feature → owner

Each row states **which MVP HTML file** to implement from, where it lives in the App Router, which feature owns it, and what to export.

Design source: `minhesab/` in the frontend MVP (e.g. `dashboard.html`, `cheques.html`).

App Router paths match current `apps/web-business/src/app/(panel)/`. Each row has **one owner**.

### 3.1 General (owner A)

| MVP design (`minhesab/`)                          | Persian title         | App Router path            | Feature     | Main component                     | Work / implementation scope                                                                            |
| ------------------------------------------------- | --------------------- | -------------------------- | ----------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `dashboard.html` + `dashboard` render in `app.js` | Dashboard / workspace | `(panel)/page.tsx`         | `dashboard` | `DashboardPage` / `DashboardBlock` | KPIs, charts, summary lists, quick links to journal/sales/checks                                       |
| `reports.html`                                    | Reports               | `(panel)/reports/page.tsx` | `reports`   | `ReportsPage`                      | Report groups (finance, treasury, sales, management); may stay placeholder + date-range dialog for now |

### 3.2 Accounting + fiscal year/period (owner B)

| MVP design                                              | Persian title  | App Router path                   | Feature          | Main component      | Work / implementation scope                                                                           |
| ------------------------------------------------------- | -------------- | --------------------------------- | ---------------- | ------------------- | ----------------------------------------------------------------------------------------------------- |
| `journal.html`                                          | Journal        | `(panel)/journal/page.tsx`        | `journal`        | `JournalPage`       | Document table, status filter, URL pagination, link to new entry                                      |
| `new-journal.html`                                      | Compound entry | `(panel)/journal/new/page.tsx`    | `journal`        | `NewJournalPage`    | Multi-line form, **live debit/credit balance check**, draft/post save                                 |
| `trial.html`                                            | Trial balance  | `(panel)/trial/page.tsx`          | `trial`          | `TrialPage`         | Trial table; date/branch filters if present in design                                                 |
| `fiscal-periods.html` + `fiscal-pages.js` / `fiscal.js` | Fiscal periods | `(panel)/fiscal-periods/page.tsx` | `fiscal-periods` | `FiscalPeriodsPage` | Period list, statuses (open/review/closing/closed/reopened), close and reopen dialogs with reason     |
| `fiscal-years.html`                                     | Fiscal years   | `(panel)/fiscal-years/page.tsx`   | `fiscal-periods` | `FiscalYearsPage`   | Year list, overlap prevention, auto-generate periods                                                  |
| `fiscal-setup.html`                                     | Fiscal setup   | `(panel)/fiscal-setup/page.tsx`   | `fiscal-periods` | `FiscalSetupWizard` | 4-step wizard: define year → create periods → open at least one → finish; status banner/chip in shell |

> All three year/period/setup pages stay under **one** feature `fiscal-periods` (shared status; MVP localStorage → later API). The top-bar chip is consumed by A in the layout from this feature’s public API.

### 3.3 Treasury (owner C)

| MVP design                                   | Persian title  | App Router path                   | Feature    | Main component       | Work / implementation scope                                                                                                                                                        |
| -------------------------------------------- | -------------- | --------------------------------- | ---------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accounts.html`                              | Bank & cash    | `(panel)/accounts/page.tsx`       | `accounts` | `AccountsPage`       | Bank/cash account list, balances, filters                                                                                                                                          |
| `cheques.html`                               | Cheques        | `(panel)/checks/page.tsx`         | `checks`   | `ChecksPage`         | Cheque table (row, number, **Sayad ID**, type, party, bank, amount, registered date, due date, status); Sayad validation; due date ≥ registered date; block duplicate number/Sayad |
| `pos.html`                                   | POS terminals  | `(panel)/pos/page.tsx`            | `pos`      | `PosPage`            | Terminal list; **block duplicate terminals**                                                                                                                                       |
| — (no separate MVP HTML; existing app route) | Payments       | `(panel)/payments/page.tsx`       | Usually C  | `PaymentsPage`       | Until design is specified → Placeholder; owner C unless lead says otherwise                                                                                                        |
| —                                            | Reconciliation | `(panel)/reconciliation/page.tsx` | Usually C  | `ReconciliationPage` | Same                                                                                                                                                                               |

> On disk the folder is `checks`; the design file is `cheques.html`. UI copy stays “Cheques” / «چک‌ها».

### 3.4 Sales and purchases (owner D)

| MVP design         | Persian title         | App Router path              | Feature     | Main component  | Work / implementation scope                                                                                               |
| ------------------ | --------------------- | ---------------------------- | ----------- | --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `invoices.html`    | Sales invoices        | `(panel)/sales/page.tsx`     | `sales`     | `SalesPage`     | Invoice table with discount, description, **seller**, **commission**; seller filter; seller performance card if in design |
| `new-invoice.html` | New invoice           | `(panel)/sales/new/page.tsx` | `sales`     | `NewSalePage`   | Line items, amount/% discount, tax, multiple payment methods, balance due, seller select and display commission           |
| `purchases.html`   | Purchases             | `(panel)/purchases/page.tsx` | `purchases` | `PurchasesPage` | Purchase list; discount/description columns per design                                                                    |
| `people.html`      | Customers & suppliers | `(panel)/people/page.tsx`    | `people`    | `PeoplePage`    | Party list, customer/supplier role, search and URL pagination                                                             |

> On disk the folder is `sales`; design files are `invoices.html` / `new-invoice.html`. UI copy stays “Sales invoices” / «فاکتورهای فروش».

### 3.5 Organization (owner D)

| MVP design                                          | Persian title         | App Router path                             | Feature    | Main component                 | Work / implementation scope                  |
| --------------------------------------------------- | --------------------- | ------------------------------------------- | ---------- | ------------------------------ | -------------------------------------------- |
| `branches.html`                                     | Branches              | `(panel)/branches/page.tsx`                 | `branches` | `BranchesPage`                 | Branch list, active status                   |
| `users.html`                                        | Users & roles         | `(panel)/users/page.tsx`                    | `users`    | `UsersPage`                    | Users, roles, invite if in design            |
| — (no dedicated MVP HTML; present in business menu) | Staff list            | `(panel)/staff/page.tsx`                    | `staff`    | `StaffPage`                    | Until design is ready → Placeholder; owner D |
| —                                                   | Access management     | `(panel)/access/page.tsx`                   | `access`   | `AccessPage`                   | Placeholder until design/API                 |
| `audit.html`                                        | Audit trail           | `(panel)/audit/page.tsx` (or `audit-trail`) | `audit`    | `AuditPage`                    | Change event list; date/user filters         |
| `settings.html`                                     | Settings              | `(panel)/settings/page.tsx`                 | `settings` | `SettingsPage`                 | Business panel settings                      |
| —                                                   | Tenants / memberships | `(panel)/tenants/...`                       | `tenants`  | `TenantsPage` and nested pages | When multi-tenant product is active          |

### 3.6 Out of scope for this document (design exists, web-business does not own it)

| MVP design                    | Title                     | Where it is implemented                                                                       |
| ----------------------------- | ------------------------- | --------------------------------------------------------------------------------------------- |
| `auth.html`                   | Login / register / forgot | **Only** `apps/frontend` → `features/auth` + `app/(auth)/` — do not duplicate in web-business |
| `landing.html` · `index.html` | Landing and redirect      | `apps/frontend` marketing                                                                     |

### 3.7 Store and extra app placeholders (no separate MVP HTML)

| Title in app                       | Path                                             | Suggested owner            | Work                               |
| ---------------------------------- | ------------------------------------------------ | -------------------------- | ---------------------------------- |
| Orders / returns / discounts       | `(panel)/store/...`                              | D                          | Until design arrives → Placeholder |
| Documents · inventory · accounting | `(panel)/documents` · `inventory` · `accounting` | Lead / leave alone for now | Placeholder                        |

Placeholder-only pages may render `PanelPlaceholder` until real work starts; **feature folder and ownership in the tables above stay fixed**.

### 3.8 Quick reference: design file → path

| Design file                  | → Path in web-business    | Owner |
| ---------------------------- | ------------------------- | ----- |
| `dashboard.html`             | `/` or `(panel)/page.tsx` | A     |
| `reports.html`               | `/reports`                | A     |
| `journal.html`               | `/journal`                | B     |
| `new-journal.html`           | `/journal/new`            | B     |
| `trial.html`                 | `/trial`                  | B     |
| `fiscal-periods.html`        | `/fiscal-periods`         | B     |
| `fiscal-years.html`          | `/fiscal-years`           | B     |
| `fiscal-setup.html`          | `/fiscal-setup`           | B     |
| `accounts.html`              | `/accounts`               | C     |
| `cheques.html`               | `/checks`                 | C     |
| `pos.html`                   | `/pos`                    | C     |
| `invoices.html`              | `/sales`                  | D     |
| `new-invoice.html`           | `/sales/new`              | D     |
| `purchases.html`             | `/purchases`              | D     |
| `people.html`                | `/people`                 | D     |
| `branches.html`              | `/branches`               | D     |
| `users.html`                 | `/users`                  | D     |
| `audit.html`                 | `/audit`                  | D     |
| `settings.html`              | `/settings`               | D     |
| `auth.html` / `landing.html` | Outside — frontend only   | —     |

---

## 4. Target tree inside `apps/web-business`

```
apps/web-business/src/
├── app/
│   ├── layout.tsx                    # App root (font, globals from @repo/web, Toaster)
│   ├── (panel)/
│   │   ├── layout.tsx                # ← A only  (AccountingPanelLayout + panel.css)
│   │   ├── panel.css                 # ← A only
│   │   ├── page.tsx                  # ← A  dashboard
│   │   ├── reports/page.tsx          # ← A
│   │   ├── journal/                  # ← B
│   │   │   ├── page.tsx
│   │   │   └── new/page.tsx
│   │   ├── trial/page.tsx            # ← B
│   │   ├── fiscal-periods/page.tsx   # ← B
│   │   ├── fiscal-years/page.tsx     # ← B
│   │   ├── fiscal-setup/page.tsx     # ← B
│   │   ├── accounts/page.tsx         # ← C
│   │   ├── checks/page.tsx           # ← C
│   │   ├── pos/page.tsx              # ← C
│   │   ├── sales/                    # ← D
│   │   │   ├── page.tsx
│   │   │   └── new/page.tsx
│   │   ├── purchases/page.tsx        # ← D
│   │   ├── people/page.tsx           # ← D
│   │   ├── branches/page.tsx         # ← D
│   │   ├── users/page.tsx            # ← D
│   │   ├── staff/page.tsx            # ← D
│   │   ├── access/page.tsx           # ← D
│   │   ├── audit/page.tsx            # ← D
│   │   ├── settings/page.tsx         # ← D
│   │   └── tenants/...               # ← D (if present)
│   └── ui-preview/page.tsx           # Visual check of shared UI (optional)
│
└── core/
    └── features/
        ├── panel/                    # ← A only (this app’s panel shell)
        │   ├── assets/mock/navigation.ts
        │   ├── components/block/layout/AccountingPanelLayout.tsx
        │   ├── components/block/placeholder/PanelPlaceholder.tsx
        │   ├── components/ui/        # ListPage, PageHeader, ListToolbar, StatsRow, StatusFilter, PanelLogoutControl
        │   ├── hooks/                # useListQuery, useStatusFilter (if still app-local)
        │   └── index.ts
        ├── shared/                   # ← A + lead only
        ├── dashboard/                # ← A
        ├── reports/                  # ← A
        ├── fiscal-periods/           # ← B   (includes years + setup + periods)
        ├── journal/                  # ← B
        ├── trial/                    # ← B
        ├── accounts/                 # ← C
        ├── checks/                   # ← C
        ├── pos/                      # ← C
        ├── sales/                    # ← D
        ├── purchases/                # ← D
        ├── people/                   # ← D
        ├── branches/                 # ← D
        ├── users/                    # ← D
        ├── staff/                    # ← D
        ├── access/                   # ← D
        ├── audit/                    # ← D
        ├── settings/                 # ← D
        └── tenants/                  # ← D
```

Real `PanelLayout` comes from `@repo/web/ui/panel`.  
`AccountingPanelLayout` in `features/panel` only wires this app’s config (`navigation.ts` + account + logoutControl) into `PanelLayout`.

---

## 5. Mandatory feature anatomy

```
core/features/<feature>/
├── assets/
│   ├── @types/           # Types for this feature only
│   └── mock/             # Demo data
├── components/
│   ├── block/            # Full page + dialogs/
│   └── ui/               # Small pieces only for this feature
├── hook/                 # or hooks/
├── lib/                  # <feature>-api.ts + validation/schemas
├── utils/
├── test/
└── index.ts              # Sole public export surface
```

Create only folders you need.  
`example` is a scaffold sample; it is not a product feature.

**`page.tsx` contract:**

```tsx
import type { Metadata } from 'next';
import { JournalPage } from '@/core/features/journal';

export const metadata: Metadata = { title: 'Journal' };

export default function Page() {
  return <JournalPage />;
}
```

---

## 6. Navigation (`navigation.ts`) — owner A only

File: `core/features/panel/assets/mock/navigation.ts`  
Type: `PanelConfiguration` from `@repo/web/ui/panel`.

| Nav section       | Items                                                | Sample href (after prefix decision)                                    |
| ----------------- | ---------------------------------------------------- | ---------------------------------------------------------------------- |
| General           | Dashboard · Reports                                  | `/` · `/reports`                                                       |
| Accounting        | Journal · New entry · Trial                          | `/journal` · `/journal/new` · `/trial`                                 |
| Finance           | Periods · Years · Setup                              | `/fiscal-periods` · `/fiscal-years` · `/fiscal-setup`                  |
| Treasury          | Bank & cash · Cheques · POS                          | `/accounts` · `/checks` · `/pos`                                       |
| Sales & purchases | Sales · New invoice · Purchases · People             | `/sales` · `/sales/new` · `/purchases` · `/people`                     |
| Organization      | Branches · Users · Staff · Access · Audit · Settings | `/branches` · `/users` · `/staff` · `/access` · `/audit` · `/settings` |

Adding a nav item = separate PR to A. Do not change `navigation.ts` in your feature PR unless you are A.

Icons are serializable `react-icons/ci` names (e.g. `CiUser`) per the reusable-panel guide.

---

## 7. Cross-feature dependencies

| Consumer                    | May import from                                                              | Forbidden                         |
| --------------------------- | ---------------------------------------------------------------------------- | --------------------------------- |
| Everyone                    | `@repo/web` · `features/panel` (from index) · `features/shared` (from index) | Deep imports into another feature |
| journal / trial / documents | `fiscal-periods` public API only (period status / posting allowed)           | accounts, sales, …                |
| layout (`panel`)            | Period status chip from `fiscal-periods` public API if needed                | Period close logic                |

Any new cross-feature dependency must be called out in the PR and approved by the lead.

---

## 8. Tables, URL, and money (shared contract)

From the DataTable / pagination guide:

1. **Source of truth for pagination = URL**  
   `page` (1-based) · `limit` (default 20, max 100) · `search`  
   via `usePagination` and `SearchInput` from `@repo/web`.
2. Changing `search` resets `page` to 1.
3. The feature fetches data and passes `rows` + server `meta` into `DataTable`.  
   `DataTable` does not fetch.
4. Table state order: `error` → `loading` → empty.
5. **Money** is always a string: `{ amount: "125000.00", currency: "IRR" }` — never a JS `number`.
6. Updates: send `expectedRevision` and handle `409` per the backend contract.

All tabular lists (cheques, invoices, periods, branches, …) follow this contract.

---

## 9. How to add or complete a feature

Example: complete “Cheques” as person C.

1. Types under `features/checks/assets/@types/` matching backend DTOs.
2. `lib/checks-api.ts` with stable signatures (`list`, `create`, …).
3. Form validation/zod under `lib/`.
4. List/create hooks.
5. `components/ui/` (status badge, Sayad field) and `components/block/ChecksPage.tsx` + dialogs.
6. Route already exists: `(panel)/checks/page.tsx` → only `<ChecksPage />`.
7. If the nav item is missing → small PR to A.
8. Logic tests under `test/`; stories for shared UI in packages if needed.
9. `pnpm typecheck && lint && test`; manually check RTL and empty/error states.

If you need a new shared component (e.g. DataTable improvement) → separate PR in `packages/web` first.

---

## 10. Branch and PR rules

| Topic                                | Rule                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------- |
| Branch name                          | `feat/checks-sayadi-validation` · `feat/fiscal-periods-close-dialog`       |
| PR scope                             | One feature; files outside your ownership are forbidden unless coordinated |
| `navigation.ts` / `panel` / `shared` | A only, or PR with an explicit label and A’s review                        |
| Review                               | At least one reviewer; lead for cross-feature changes                      |

---

## 11. Definition of done (each page/feature)

- [ ] PR only touches paths I own
- [ ] `page.tsx` is thin (import + render)
- [ ] Public export from `index.ts` is done
- [ ] loading / empty / error defined for list or form
- [ ] Money and dates follow contract (IRR string, Jalali in UI)
- [ ] Pagination/search via URL if the view is a table list
- [ ] Tests for hook / validation / API mapper
- [ ] I did not change navigation without coordination
- [ ] No deep import from another feature
- [ ] typecheck, lint, and relevant tests are green

---

## 12. One-glance summary

| Layer                                 | Where                                  | Who (4 parallel mode)             | Who (2+2 mode)                       |
| ------------------------------------- | -------------------------------------- | --------------------------------- | ------------------------------------ |
| Domain-free shared shell              | `packages/web`                         | Small PR; package technical owner | Same                                 |
| App shell + nav + dashboard + reports | `panel` / `dashboard` / `reports`      | A                                 | Tenant group (A)                     |
| Fiscal periods + journals + trial     | `fiscal-periods` / `journal` / `trial` | B                                 | Fiscal group (B)                     |
| Bank + cheques + POS                  | `accounts` / `checks` / `pos`          | C                                 | Fiscal group (C)                     |
| Org + tenants + …                     | `tenants` / `users` / `staff` / …      | D                                 | Tenant group (D)                     |
| Sales + purchases                     | `sales` / `purchases`                  | D                                 | Frozen or, by lead decision → Tenant |
| Auth                                  | `apps/frontend` only                   | Out of this document              | Out of this document                 |

```
Default mode:  A ∥ B ∥ C ∥ D
2+2 mode:      Tenant = D+A    |    Fiscal = B+C
```

This file is the structure law for the entire business panel in `web-business`. If it conflicts with prior team habit, **this document wins** unless the lead grants a written exception.
