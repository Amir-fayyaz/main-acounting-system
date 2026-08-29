# Multi-Tenancy Architecture

## 1. Purpose

This document defines the tenant model and tenant-isolation requirements of
the Accounting SaaS platform.

Multi-tenancy is a foundational architectural requirement. It must be part of
the system from the beginning and must not be introduced as a later feature.

The current product requirements define a shared database/shared schema
strategy with shop ownership represented by a `shop_id` field on
shop-owned data.

---

## 2. Multi-Tenancy Model

The platform serves multiple independent businesses on shared application
infrastructure.

Conceptually:

```text
                    SaaS Platform
                          |
        +-----------------+-----------------+
        |                 |                 |
        v                 v                 v
     Shop A            Shop B            Shop C
     Tenant A          Tenant B          Tenant C
        |                 |                 |
   Users / Data       Users / Data       Users / Data
```

Each shop is treated as an isolated tenant boundary for shop-owned business
data.

One platform can contain many shops, but data belonging to one shop must not be
implicitly visible to another shop.

---

## 3. Tenant and Shop Terminology

For the current product model:

- `Platform` refers to the SaaS system as a whole.
- `Shop` refers to an independent business/store represented in the product.
- `Tenant` refers to the isolation boundary associated with a shop.
- `User` refers to an identity that may operate at platform or shop scope.

For the MVP, the working assumption is:

```text
1 Shop = 1 Tenant
```

This terminology should remain explicit in code and documentation to prevent
tenant concepts from becoming ambiguous.

---

## 4. Tenant Ownership

Shop-owned data must have an explicit tenant owner.

Examples include:

- Products
- Product categories
- Invoices
- Invoice items
- Customers
- Suppliers
- Expenses
- Inventory state
- Inventory movements
- Cash accounts
- Bank accounts
- Payments
- Checks
- Shop-specific reports/read models
- Other transactional business data introduced later

The canonical tenant ownership field in the current architecture is:

```text
shop_id
```

The exact entity-by-entity ownership mapping will be defined in the domain and
database documentation.

---

## 5. Database Strategy

### 5.1 Initial Strategy

The current product requirements propose:

> Shared Database, Shared Schema with a `shop_id` column.

Conceptually:

```text
                Shared Database
                       |
              Shared Application Schema
                       |
        +--------------+--------------+
        |              |              |
     shop_id=A      shop_id=B      shop_id=C
        |              |              |
     Shop A data    Shop B data    Shop C data
```

This approach is selected for the initial product because it is simpler and
less expensive than:

- Schema-per-tenant
- Database-per-tenant

It also preserves a migration path toward other tenancy strategies if future
scale or compliance requirements make that necessary.

---

## 6. Tenant Resolution

Every shop-scoped request must resolve an active tenant context before
executing tenant-owned business operations.

The conceptual request flow is:

```text
HTTP Request
     ↓
Authentication
     ↓
Identify User
     ↓
Resolve Active Shop / Tenant
     ↓
Authorize User for Tenant
     ↓
Create Tenant Context
     ↓
Execute Use Case
     ↓
Tenant-Scoped Data Access
```

The tenant context is a trusted server-side context derived from authenticated
identity and authorization data.

The frontend must not be treated as the security authority for tenant
selection.

---

## 7. JWT and Active Tenant

The current product requirements state that shop-level JWTs should include
the active `shop_id`, or that an Owner with multiple shops should have access
to a list of shops.

This document therefore defines the concept of an active tenant without
locking the final token structure prematurely.

Possible representation:

```text
JWT
├── user_id
├── role
├── shop_id              # active shop, when applicable
└── permitted_shop_ids   # optional/future representation
```

The exact token claims remain an implementation decision.

Important rule:

> A value supplied by the client must never be trusted as tenant authorization
> by itself.

The server must validate that the authenticated user is actually authorized
to operate on the selected shop.

---

## 8. User-to-Tenant Relationship

Shop-level users must have an explicit relationship with the shop they are
authorized to access.

The relationship may be represented as ownership or membership depending on
the final domain model.

Conceptually:

```text
User
 |
 +---- owns/is-member-of ----> Shop / Tenant
                                  |
                                  +---- Role
```

For example:

```text
Owner A
 ├── Shop A
 └── Shop B

Cashier X
 └── Shop A

Stock Keeper Y
 └── Shop B
```

An Owner may therefore be associated with multiple shops.

A Cashier or Stock Keeper is expected to operate within the shop(s) for which
they have explicit authorization.

The exact cardinality rules for non-owner roles remain subject to final
product decisions.

---

## 9. Authorization Model

Tenant isolation requires more than checking the user's role.

A tenant-scoped request must satisfy all relevant conditions:

```text
Authenticated Identity
        +
Role / Permission
        +
Tenant Membership / Ownership
        +
Resource Belongs to Tenant
        =
Authorized Access
```

Example:

```text
Cashier from Shop A
        +
"Read Invoice" permission
        +
Invoice belongs to Shop B
        =
DENY
```

Having a valid role does not grant access to arbitrary tenant resources.

---

## 10. Resource Isolation

Every operation involving a shop-owned resource must verify tenant ownership.

Examples:

### Read

```text
GET /invoices/{invoiceId}

User tenant = A
Invoice tenant = B

→ deny request
```

### Update

```text
UPDATE Product X

User tenant = A
Product tenant = B

→ deny request
```

### Delete

```text
DELETE Customer X

User tenant = A
Customer tenant = B

→ deny request
```

The system must not rely on the frontend or on the caller supplying the
correct `shop_id`.

---

## 11. Query Isolation

Tenant filtering must be consistent across all data-access paths.

Conceptually:

```text
Unsafe:

SELECT *
FROM invoices
WHERE id = :id;


Tenant-safe:

SELECT *
FROM invoices
WHERE id = :id
  AND shop_id = :currentShopId;
```

For list queries:

```text
SELECT *
FROM invoices
WHERE shop_id = :currentShopId;
```

The architecture should prefer mechanisms that make forgetting tenant
constraints difficult.

Possible implementation techniques include:

- Tenant-aware repositories
- ORM query extensions
- Repository base classes
- Query interceptors
- Application-level tenant context
- Database-level protection where appropriate

The final mechanism is an implementation decision and must be documented in
the application-architecture and security documents.

---

## 12. Write Isolation

Tenant isolation applies to writes as well as reads.

A tenant-owned record must not be created for an arbitrary tenant merely because
a request contains a `shop_id`.

Preferred conceptual behavior:

```text
Current Tenant Context
        ↓
Create Product
        ↓
Server assigns shop_id
        ↓
Persist Product
```

rather than:

```text
Client sends shop_id
        ↓
Persist whatever value was supplied
```

The server is responsible for establishing tenant ownership.

---

## 13. Tenant Context Rules

The tenant context should follow these principles:

### Rule 1 — Explicit

Every shop-scoped business operation must execute with a known tenant
context.

### Rule 2 — Server-Controlled

Tenant context must be established and validated by the server.

### Rule 3 — Mandatory

Business operations requiring tenant-owned data must fail when no valid tenant
context exists.

### Rule 4 — Consistent

All modules accessing tenant-owned data must use the same tenant-context
semantics.

### Rule 5 — No Silent Fallback

The system must never silently fall back to another tenant or to a global
tenant when the active tenant is missing or invalid.

---

## 14. Super Admin Boundary

Super Admin is a platform-level actor and is not treated as an ordinary
tenant user.

The current product requirements explicitly state:

- Super Admin can manage shops at platform level.
- Super Admin can manage subscription plans.
- Super Admin must not directly access shop financial data through ordinary
  shop APIs.
- Exceptional support access, if introduced, should use a separate mechanism
  with complete audit logging.

Therefore:

```text
Super Admin
    ↓
Platform APIs
    ↓
Shop Metadata / Platform Operations
```

must remain conceptually separate from:

```text
Shop User
    ↓
Tenant APIs
    ↓
Shop Financial / Operational Data
```

A platform-level role should not automatically bypass tenant protections.

---

## 15. Multi-Shop Owner Flow

The product supports an Owner who owns multiple shops.

Conceptual flow:

```text
Login
  ↓
Identify Owner
  ↓
Load Authorized Shops
  ↓
Select Active Shop
  ↓
Establish Tenant Context
  ↓
Use Shop-Scoped Application
```

When switching:

```text
Shop A
  ↓
Switch Shop
  ↓
Validate Owner has access to Shop B
  ↓
Establish Tenant Context = Shop B
  ↓
All subsequent operations use Shop B
```

A shop switch must not result in stale data from the previously selected
tenant being presented or mutated.

Caching and client state must therefore also respect the active tenant.

---

## 16. Cross-Tenant Access Threats

The design must explicitly protect against common isolation failures.

### 16.1 Direct ID Access

A malicious user may guess or obtain another tenant's resource ID.

Protection:

```text
resource_id
+
current_tenant_id
```

must both be considered when authorizing access.

---

### 16.2 Client-Supplied Tenant ID

A client may attempt:

```text
POST /products
{
  "shop_id": "another-shop"
}
```

Protection:

The server must derive or validate tenant ownership from trusted tenant
context rather than trusting arbitrary client input.

---

### 16.3 Missing Filter

A developer may accidentally implement:

```text
repository.findMany()
```

for a tenant-owned entity.

Protection:

The data-access architecture and automated tests should make missing tenant
scope detectable.

---

### 16.4 Background Jobs

Background workers do not necessarily originate from an authenticated HTTP
request.

Therefore, tenant context must be explicitly propagated into background work.

Conceptually:

```text
Tenant A Event
     ↓
Queue Message
     ↓
Worker
     ↓
Tenant Context = A
     ↓
Tenant A Operation
```

A background job must never execute tenant-owned work without a known tenant
context.

---

### 16.5 Cache Leakage

Caches must not return data across tenants.

Tenant-owned cache keys should include tenant identity where applicable.

Example:

```text
product:{shopId}:{productId}
```

rather than:

```text
product:{productId}
```

The exact caching strategy is a future infrastructure decision.

---

## 17. Transactions and Tenant Isolation

Tenant validation must happen before or as part of transactional business
operations.

A transaction must never accidentally combine data belonging to different
tenants.

For example, a sale operation must operate on:

```text
Invoice       → Tenant A
InvoiceItems  → Tenant A
Inventory     → Tenant A
Customer      → Tenant A
Payment       → Tenant A
```

Mixing resources from Tenant A and Tenant B in one business operation must be
treated as an invalid operation.

---

## 18. Unique Constraints

Tenant ownership affects uniqueness.

A business value that must be unique _within a shop_ should generally be scoped
by tenant.

Example:

```text
(shop_id, barcode)
```

may be unique even when the same barcode exists in another shop.

This principle must be evaluated entity by entity in the database design.

Global uniqueness should only be used where the business requirement is
truly global.

---

## 19. Tenant-Aware Auditing

Audit records for shop operations should preserve tenant context.

At minimum, an auditable shop operation should be attributable to:

```text
Who
What
When
Which Tenant
Which Resource
```

Example:

```text
User: 123
Tenant: Shop A
Action: InvoiceConfirmed
Resource: Invoice 456
Time: ...
```

The exact audit-event schema will be defined in the security/audit
documentation.

---

## 20. Testing Requirements

Tenant isolation must have dedicated automated tests.

At minimum, the test strategy should cover:

### Test 1 — Read Isolation

A user from Shop A cannot read Shop B's invoice.

### Test 2 — Update Isolation

A user from Shop A cannot update Shop B's product.

### Test 3 — Delete Isolation

A user from Shop A cannot delete Shop B's customer.

### Test 4 — List Isolation

A list endpoint for Shop A never returns Shop B records.

### Test 5 — Create Isolation

A Shop A user cannot create a resource owned by Shop B by supplying a
different `shop_id`.

### Test 6 — Multi-Shop Owner

An Owner with Shops A and B can access only the currently authorized/selected
shop context.

### Test 7 — Super Admin Boundary

Super Admin cannot use normal tenant APIs to access shop financial data.

### Test 8 — Background Job Isolation

A background job created for Shop A cannot operate on Shop B data.

Tenant isolation tests should run in CI because a regression here is a
security defect.

---

## 21. Migration and Future Scalability

The initial shared-database/shared-schema model does not prevent future
migration to:

- Schema-per-tenant
- Database-per-tenant
- Region-based tenant partitioning
- Other isolation strategies

To preserve this migration path:

- Tenant identity should be explicit in the domain.
- Data ownership should be explicit.
- Business logic should not depend on physical database layout.
- Repositories should hide storage-specific details where practical.
- Tenant-aware tests should be independent of the physical isolation
  strategy.

---

## 22. Non-Goals

This document does not define:

- Exact ORM implementation
- Exact JWT claim structure
- Exact middleware/guard implementation
- Exact database engine
- Exact repository pattern
- Exact cache implementation
- Exact queue implementation
- Full row-level security strategy
- Production deployment topology

Those decisions belong in the relevant architecture and infrastructure
documents.

---

## 23. Required Architectural Invariants

The following invariants must remain true regardless of implementation:

```text
1. Every shop-owned resource has an identifiable tenant owner.

2. Every shop-scoped operation executes within a validated tenant context.

3. A user cannot access a resource outside their authorized tenant scope.

4. Client-supplied tenant identifiers are not trusted without server-side
   authorization.

5. Reads and writes are both tenant-isolated.

6. Background jobs must carry tenant context when operating on tenant data.

7. Caches and derived/read models must not leak data across tenants.

8. Super Admin platform privileges do not automatically grant ordinary
   access to shop financial data.

9. Tenant isolation regressions are security defects and must be covered by
   automated tests.

10. The physical database isolation strategy may change later, but the logical
    tenant boundary must remain stable.
```

---

## 24. Open Decisions

The following decisions remain to be finalized:

1. Exact representation of `User ↔ Shop` ownership/membership.
2. Whether `1 Shop = 1 Tenant` remains a permanent domain rule.
3. Exact JWT claims for active and authorized shops.
4. Exact tenant-context mechanism in the application.
5. Repository/ORM strategy for enforcing tenant filtering.
6. Whether database-level row security will be used as an additional defense.
7. Exact behavior when an Owner switches shops.
8. Exact permissions for users associated with multiple shops.
9. Background job context propagation mechanism.
10. Cache-key conventions.
11. Audit-log storage model.
12. Whether selected platform support tools will allow controlled cross-tenant
    access in the future.
