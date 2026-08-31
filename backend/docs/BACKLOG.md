# Backlog — Accounting SaaS MVP

This backlog is based on `wiki/product/scope.md`, the final MVP decisions in
`wiki/product/mvp-decisions-final.md`, and the implementation contracts in
`wiki/api/` and `wiki/data/`.

## Recommended starting point

Start with **Identity and Tenant Context**, then implement the shared
authorization layer. Every business module depends on authenticated users,
tenant membership, active-tenant resolution, and server-side isolation. Starting
with sales or inventory before these foundations would create rework and make
security defects harder to detect.

Recommended sequence:

1. Infrastructure and shared kernel
2. Identity and tenants
3. Authorization and tenant-isolation tests
4. Catalog and contacts
5. Inventory and valuation
6. Sales and purchases
7. Payments and expenses
8. Reports and dashboard

## Phase 1 — Foundation

### P1.1 Infrastructure

- [ ] Add Prisma, PostgreSQL, Redis, and BullMQ configuration.
- [ ] Add environment validation and `.env.example`.
- [ ] Add the initial migration for users, tenants, and memberships.
- [ ] Add structured logging, request IDs, health checks, and graceful shutdown.
- [ ] Add OpenAPI/Swagger validation to CI.
- [ ] Add CI for lint, build, unit tests, and integration tests.

### P1.2 Shared kernel

- [ ] Implement tenant context using request-scoped context.
- [ ] Implement JWT access tokens and rotated refresh tokens.
- [ ] Implement `ActiveTenantGuard` and `RoleGuard`.
- [ ] Implement shared error codes and exception mapping.
- [ ] Implement idempotency-key storage and replay behavior.
- [ ] Implement money and clock value objects.
- [ ] Define domain event and outbox interfaces.

### P1.3 Identity module — US-1.1, US-1.2

- [ ] Implement User, RefreshToken, and failed-login tracking.
- [ ] Implement register, login, refresh, logout, and password change use cases.
- [ ] Use Argon2id for passwords and lock after five failed attempts for 15 minutes.
- [ ] Implement `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`.
- [ ] Add authentication, validation, and replay tests.

### P1.4 Tenants module — US-1.3, US-1.5, US-1.6, US-1.8, US-1.9

- [ ] Implement Tenant and TenantMembership aggregates.
- [ ] Implement tenant creation, update, member management, and switching.
- [ ] Implement Super Admin tenant activation/deactivation boundary.
- [ ] Enforce composite tenant-aware foreign keys and repository scopes.
- [ ] Add cross-tenant read, write, list, and background-job tests.

## Phase 2 — Core operations

### P2.1 Catalog — US-2.1, US-2.2, US-2.3

- [ ] Implement Product, Service, and ProductCategory.
- [ ] Implement create, update, archive, search, and category operations.
- [ ] Enforce tenant-scoped SKU/barcode uniqueness and non-negative prices.

### P2.2 Contacts — US-5.1, US-5.2

- [ ] Implement Customer and Supplier.
- [ ] Implement history queries from immutable transactions.
- [ ] Add contact validation and tenant-isolation tests.

### P2.3 Inventory — US-2.4, US-2.5

- [ ] Implement immutable InventoryMovement and rebuildable InventoryBalance.
- [ ] Implement inventory layers with FIFO/LIFO consumption.
- [ ] Implement purchase, sale, return, and reasoned adjustment movements.
- [ ] Lock affected rows and recheck stock inside the transaction.
- [ ] Add insufficient-stock and concurrent-sale tests.

### P2.4 Sales and purchases — US-3.1, US-3.3, US-3.5, US-4.1

- [ ] Implement immutable sales and purchase invoices.
- [ ] Implement atomic confirmation workflows.
- [ ] Implement mixed payment rows and credit validation.
- [ ] Implement linked returns and reversals.
- [ ] Add idempotency, immutability, reconciliation, and end-to-end tests.

### P2.5 Cash and banking — US-6.1, US-6.2

- [ ] Implement financial accounts, payments, and expenses.
- [ ] Enforce account ownership and role permissions.
- [ ] Reconcile cash/card/credit totals with invoices.

## Phase 3 — Reporting

- [ ] Implement sales, profit/loss, debtors/creditors, and inventory reports.
- [ ] Implement the financial dashboard summary.
- [ ] Apply tenant timezone and stable pagination to all report queries.
- [ ] Add projection rebuild and report correctness tests.

## Phase 4 — Secondary MVP work

- [ ] Add invoice PDF generation and sending.
- [ ] Add low-stock alerts.
- [ ] Add multiple financial accounts UI/API completion.
- [ ] Add any approved discount extensions beyond the MVP fixed discount.

## Deferred

Checks, payment reminders, VAT/tax, opening balances, fiscal periods, online
payments, professional double-entry accounting, worker extraction, read
replicas, and advanced observability remain outside the initial implementation.

## Definition of Done

- [ ] Domain, application, integration, API, and critical end-to-end tests pass.
- [ ] Tenant isolation and authorization tests pass.
- [ ] Migration works on an empty and representative database.
- [ ] OpenAPI and relevant wiki contracts are updated.
- [ ] Lint and build pass.
- [ ] Staging smoke test and Product Owner review are complete.

