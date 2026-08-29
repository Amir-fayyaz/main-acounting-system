# MVP Database Schema

## 1. Conventions

- Every Tenant-owned table contains non-null `tenant_id`.
- Every table contains `id`, `created_at`, and `updated_at` where applicable.
- IDs are opaque values and are never used as a security boundary.
- Financial and inventory history is append-only.
- Foreign keys and tenant-aware constraints prevent cross-Tenant references.

## 2. Platform and Identity

### users

`id`, `name`, `phone_or_email`, `password_hash`, `status`, `created_at`,
`updated_at`.

### tenants

`id`, `owner_user_id`, `name`, `status`, `currency`, `valuation_method`
(`FIFO` or `LIFO`), `created_at`, `updated_at`.

Each Tenant has exactly one Owner. A User may own multiple Tenants.

### tenant_memberships

`id`, `tenant_id`, `user_id`, `role`, `status`, `created_at`, `updated_at`.

Unique constraint: `(tenant_id, user_id)`.

## 3. Catalog and Contacts

### products

`id`, `tenant_id`, `name`, `sku`, `barcode`, `type` (`PRODUCT` or `SERVICE`),
`sale_price`, `purchase_cost`, `is_active`, timestamps.

Tenant-scoped uniqueness applies to `sku` and `barcode` when present.

### customers / suppliers

Each contains `id`, `tenant_id`, `name`, `phone`, `email`, `is_active`, and
timestamps. Customer and Supplier records may share the same person/business
but remain separate MVP records.

## 4. Sales and Purchases

### sales_invoices / purchase_invoices

`id`, `tenant_id`, `number`, `status`, `customer_id` or `supplier_id`,
`subtotal`, `discount_total`, `total`, `currency`, `confirmed_at`, `created_by`,
timestamps.

Invoice number is unique within a Tenant. Confirmed documents are immutable.

### invoice_items

`id`, `tenant_id`, `invoice_id`, `product_id`, `description`, `quantity`,
`unit_price`, `unit_cost`, `line_total`.

The database must enforce that invoice, item, and product belong to the same
Tenant.

## 5. Inventory

### inventory_balances

`id`, `tenant_id`, `product_id`, `quantity`, `updated_at`.

Unique constraint: `(tenant_id, product_id)`. This is a rebuildable projection.

### inventory_movements

`id`, `tenant_id`, `product_id`, `type`, `quantity`, `unit_cost`, `reference_type`,
`reference_id`, `reason`, `created_by`, `created_at`.

Movements cannot be updated or deleted after creation.

## 6. Money and Settlements

### financial_accounts

`id`, `tenant_id`, `name`, `type` (`CASH` or `BANK`), `is_active`, timestamps.

### payments

`id`, `tenant_id`, `invoice_id`, `financial_account_id`, `method`, `amount`,
`direction`, `created_by`, `created_at`.

Mixed payments are represented by multiple payment rows belonging to one
invoice. Credit is represented by an outstanding balance.

### expenses

`id`, `tenant_id`, `financial_account_id`, `amount`, `description`, `status`,
`created_by`, timestamps.

## 7. Audit and Corrections

### document_links

`id`, `tenant_id`, `source_type`, `source_id`, `target_type`, `target_id`,
`link_type` (`RETURN`, `REVERSAL`, or `CORRECTION`), `created_by`, `created_at`.

### audit_events

`id`, `tenant_id`, `actor_user_id`, `action`, `resource_type`, `resource_id`,
`metadata`, `created_at`.

Audit events are append-only and must not contain passwords or payment secrets.

## 8. Required Indexes

- `(tenant_id, created_at)` on transactional tables
- `(tenant_id, status)` on invoices and users
- `(tenant_id, product_id)` on inventory tables
- `(tenant_id, barcode)` and `(tenant_id, sku)` on products
- Foreign-key indexes for all tenant-owned references

## 9. Transactional Constraints

Sale confirmation, inventory movements, payment rows, and balance projection
updates occur in one database transaction. Stock is locked or atomically
updated so concurrent sales cannot create a negative balance.
