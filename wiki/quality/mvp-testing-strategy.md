# MVP Testing Strategy

## 1. Test Pyramid

- Unit tests: domain rules, calculations, state transitions, permissions.
- Integration tests: repositories, transactions, constraints, migrations.
- API tests: authentication, authorization, validation, idempotency, errors.
- End-to-end tests: critical user journeys across API and database.

## 2. Mandatory Scenarios

### Tenant Isolation

- User cannot read, update, or delete another Tenant's resource.
- Lists never return records from another Tenant.
- Client-supplied Tenant IDs cannot bypass membership checks.
- Background jobs preserve Tenant context.

### Inventory

- Sale decreases stock atomically.
- Sale fails when stock is insufficient.
- Concurrent sales never create negative stock.
- Purchase and return increase stock correctly.
- Every adjustment requires a reason.
- FIFO and LIFO produce the expected cost result.

### Financial Integrity

- Confirmed documents cannot be deleted or directly edited.
- Returns and reversals create linked compensating records.
- Mixed payments reconcile exactly to the invoice total.
- Credit sales require a Customer.
- Customer and Supplier balances reconcile with transactions.

### Authorization

- Owner has full access within owned Tenant.
- Accountant can perform financial operations but cannot change ownership.
- Cashier can sell and register customers but cannot access P&L.
- Stock Keeper can manage stock but cannot create financial invoices.
- Super Admin cannot use ordinary Tenant financial APIs.

## 3. Release Gates

No release is allowed when any tenant-isolation, negative-stock, immutable-
document, or authorization test fails. Database migrations must run against a
fresh database and a representative existing dataset before release.
