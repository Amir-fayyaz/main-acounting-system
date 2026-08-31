# Prisma/Migration-Ready MVP Model

This is the canonical physical-model checklist for the first migration.

## Required enums

`TenantStatus = ACTIVE | SUSPENDED`, `MembershipStatus = INVITED | ACTIVE |
SUSPENDED`, `Role = OWNER | ACCOUNTANT | CASHIER | STOCK_KEEPER`,
`ProductType = PRODUCT | SERVICE`, `InvoiceStatus = CONFIRMED | REVERSED`,
`PaymentMethod = CASH | CARD | CREDIT`, `PaymentDirection = IN | OUT`,
`MovementType = PURCHASE | SALE | RETURN | ADJUSTMENT`,
`AccountType = CASH | BANK`.

## Constraints

- Every tenant-owned foreign key is paired with `tenant_id`; composite foreign
  keys prevent cross-tenant references.
- Money columns are `BIGINT NOT NULL CHECK (value >= 0)` where applicable.
- Quantities are fixed-precision decimals and must be positive on invoice lines.
- Unique keys: `(tenant_id, number)`, `(tenant_id, sku)`, `(tenant_id, barcode)`
  with nullable partial indexes, `(tenant_id, user_id)` memberships.
- `inventory_balances` is unique on `(tenant_id, product_id)`.
- Append-only tables reject UPDATE/DELETE through repository policy and database
  permissions; corrections are inserts.

## Transaction requirements

Sale and purchase confirmation run at `READ COMMITTED` with row locks on the
affected balance/layers, validate all lines before writing, and insert an
idempotency record in the same transaction. A retry returns the original result.

## Indexes

Add tenant-prefixed indexes for status, created time, invoice number, product
search fields, foreign keys, inventory movement references, and audit resource.
Use a migration test against both an empty and representative populated DB.

