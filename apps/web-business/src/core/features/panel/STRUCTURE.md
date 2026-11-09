# Panel Feature Migration Structure

## Overview

The `panel` feature currently serves as a shell containing domain logic that should be migrated to individual feature modules. This document tracks the migration plan to minimize merge conflicts for the 4-person team.

## Current State

Domain APIs, mocks, and blocks live under `core/features/panel` causing potential conflicts:

- Journal, Accounts, Dashboard, etc. all have code in panel
- The panel must become shell-only over time

## Migration Map (for later PRs, one feature per PR)

### A (Platform) - Features: panel, shared, dashboard, reports

```text
panel/.../dashboard/* + dashboard-api + dashboard mock/types → features/dashboard
```

### B (Fiscal & Journal) - Features: fiscal-periods (exists), journal, trial

```text
panel/.../journal/* + journal-api → features/journal
panel/lib/trial-balance-api.ts → features/trial
```

### C (Treasury) - Features: accounts, checks, pos

```text
panel/lib/accounts-api.ts → features/accounts
panel/lib/cheques-api.ts → features/checks
panel/lib/pos-api.ts → features/pos
```

### D (Commerce & Org) - Features: sales, purchases, people, branches, users, staff, access, audit, settings, tenants

```text
panel/lib/invoices-api.ts → features/sales
panel/lib/purchases-api.ts → features/purchases
panel/lib/people-api.ts → features/people
panel/lib/branches-api.ts → features/branches
panel/lib/users-api.ts → features/users
panel/lib/audit-api.ts → features/audit
panel/lib/reports-api.ts → features/reports
```

## What panel should keep (Shell Only)

After migration, panel should only keep:

- `assets/mock/navigation.ts` - Panel navigation
- `components/block/layout/AccountingPanelLayout.tsx` - Main layout
- `components/block/placeholder/PanelPlaceholder.tsx` - Placeholder component
- Panel-specific UI helpers (ListPage, ListToolbar, PageHeader, StatsRow, StatusFilter, PanelLogoutControl) until/unless moved to shared
- Hooks that are truly panel-wide (useListQuery, useStatusFilter) — candidates for features/shared later

## Ownership Rules

- **A (Platform):** features/panel, features/shared, features/dashboard, features/reports, app/(panel)/layout.tsx, panel.css, navigation.ts
- **B (Fiscal & Journal):** features/fiscal-periods (already exists — leave its real code intact), features/journal, features/trial
- **C (Treasury):** features/accounts, features/checks, features/pos
- **D (Commerce & Org):** features/sales, features/purchases, features/people, features/branches, features/users, features/staff, features/access, features/audit, features/settings, features/tenants (skeleton exists)

## Migration Guidelines

1. One feature per PR
2. Create feature skeleton first if not exists
3. Move domain logic, APIs, types, mocks
4. Update imports in routes
5. Keep panel running during migration - thin pages reference feature public API when available
6. Never delete existing panel real files until migration is complete
7. Don't modify core/features/fiscal-periods - it already has real implementation
