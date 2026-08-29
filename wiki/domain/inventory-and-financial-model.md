# MVP Inventory and Financial Model

## 1. Scope

This document defines the minimum authoritative model for stock, sales,
purchases, payments, and balances.

## 2. Inventory Source of Truth

`InventoryMovement` is the immutable source of truth. `InventoryBalance` is a
tenant/product projection used for fast reads and must be rebuildable from
movements.

Movement types include `PURCHASE`, `SALE`, `RETURN_IN`, `RETURN_OUT`,
`ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `WASTE`, and `DAMAGE`.

Every movement contains `tenant_id`, `product_id`, quantity, unit cost when
applicable, type, reason/reference, actor, and timestamp.

## 3. Stock Rules

- A sale reserves/decreases stock atomically when confirmed.
- A purchase increases stock atomically when confirmed.
- A return creates a new movement; it never edits the original movement.
- Available stock must be checked inside the transaction.
- Concurrent sales must not allow stock to become negative.
- Manual adjustments require a reason and audit record.

## 4. Valuation

Each Tenant selects `FIFO` or `LIFO` in Tenant settings. The selection is
effective for future movements and does not rewrite historical documents.

## 5. Financial Documents

Sales invoices, purchase invoices, payments, receipts, expenses, and
corrections are append-only business records. They may be cancelled or
reversed only through a new linked record.

## 6. Payments and Balances

Supported payment methods are cash, card/bank, credit, and mixed payment.
Credit transactions require a Customer or Supplier reference as applicable.
Balances are calculated from confirmed invoices, payments, returns, and
reversals.

## 7. Future Extensions

The model leaves room for multiple warehouses, batches, serial numbers,
expiry dates, approval workflows, double-entry accounting, and fiscal periods.
