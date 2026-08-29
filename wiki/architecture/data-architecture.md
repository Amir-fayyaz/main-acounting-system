# Data Architecture

## 1. Purpose

This document defines the high-level principles for persistent business data. It does not yet define the complete ERD or individual table schemas.

## 2. Data Ownership

Every domain entity must have an explicit owner/boundary.

For shop-owned data, tenant ownership is represented logically by the shop/tenant boundary.

Examples include products, invoices, customers, suppliers, inventory, payments, expenses, and shop accounts.

## 3. Initial Persistence Direction

The current product direction is:

```text
Shared Database
      ↓
Shared Schema
      ↓
Tenant-owned records carry shop_id
```

The physical strategy must not leak into domain logic.

## 4. Source of Truth

Operational modules must define an explicit source of truth for each piece of state.

Examples to resolve in the domain/data phase:

- Inventory quantity vs. inventory movements
- Customer balance vs. financial transactions
- Cash balance vs. cash movements
- Supplier balance vs. supplier transactions
- Profit calculation vs. accounting postings

Derived values must not accidentally become independent competing sources of truth.

## 5. IDs

The final identifier strategy is not yet decided.

Identifiers must be safe to expose through APIs where required and must not be relied upon as a tenant-security boundary by themselves.

## 6. Tenant-Aware Uniqueness

Uniqueness must be classified as either:

- Global
- Tenant-scoped

For tenant-scoped values, uniqueness should normally include tenant identity.

Example:

```text
UNIQUE(shop_id, barcode)
```

## 7. Referential Integrity

Relationships between persistent records should use database constraints where appropriate.

Cross-tenant references must be impossible or explicitly validated.

For example, an invoice for Shop A must not reference a customer belonging to Shop B.

## 8. Historical Integrity

Financial and inventory history should remain traceable.

Operations that materially change history should prefer explicit correction/return/reversal mechanisms over destructive mutation where business rules require historical traceability.

## 9. Soft Delete vs. Hard Delete

The final deletion strategy is not yet defined.

Financially significant records may require non-destructive lifecycle states rather than physical deletion.

## 10. Indexing

Indexes should support:

- Tenant-scoped lookup
- Common business searches
- Foreign-key relationships
- Time-range reporting
- High-frequency operational queries

Tenant scope should be considered when designing indexes for tenant-owned tables.

## 11. Reporting Data

Reporting may use read models or optimized queries, but reporting structures must remain traceable to operational source data.

A reporting projection must not silently become the source of truth for a business transaction.

## 12. Migration Principles

Schema changes must be versioned and reproducible.

Migrations must consider tenant scale and historical data.

Potentially destructive migrations require explicit review and backup/recovery consideration.

## 13. Open Decisions

- Database engine: PostgreSQL.
- ORM: Prisma.
- ID strategy: UUID v4.
- Table ownership: explicit Tenant ownership.
- Normal-entity lifecycle: `is_active`; financial history is immutable.
- Remaining open items are audit retention, advanced reporting strategy, and
  partitioning if scale later requires it.
