# Business Rules

## 1. Purpose

This document collects business rules currently supported by the product
requirements.

These rules describe business behavior rather than database implementation.
They should eventually become automated tests and domain/application
validation rules.

Rules that are not supported by the current requirements are marked `TBD`.

When an older rule in this document says `TBD` but a newer approved decision
exists in `wiki/product/mvp-decisions-final.md`, the final decision wins.
See `wiki/product/documentation-status.md` for the source-of-truth rule.

---

## 2. Tenant Rules

### BR-TENANT-001 — Shop Data Isolation

Shop-owned data belongs to a single shop/tenant.

A user must not access another tenant's data.

### BR-TENANT-002 — Tenant-Aware Operations

Shop-scoped business operations must execute within a validated tenant
context.

### BR-TENANT-003 — Super Admin Boundary

Super Admin platform privileges do not imply ordinary access to shop financial
data.

---

## 3. User and Access Rules

### BR-USER-001 — Password Minimum Length

The current MVP requirement defines a minimum password length of eight
characters.

### BR-USER-002 — Failed Login Lock

After five incorrect password attempts, the account is locked for fifteen
minutes.

### BR-USER-003 — Inactive User

A deactivated user cannot log in normally.

### BR-USER-004 — Inactive Shop

When a shop is deactivated, its Owner/Cashier/Stock Keeper users can no longer
operate normally within that shop.

### BR-USER-005 — Role Restriction

A user's access is constrained by role and tenant scope.

---

## 4. Product Rules

### BR-PRODUCT-001 — Product Name / Identity

A product must contain the information required to identify and sell it.

### BR-PRODUCT-002 — Product Code Uniqueness

SKU and barcode are optional on a product. When present, both must be unique
within the tenant. Products without a barcode/SKU are allowed.

### BR-PRODUCT-003 — Non-Negative Price

Product and service prices are non-negative. A service never creates stock.

---

## 5. Inventory Rules

### BR-INV-001 — Sale Decreases Stock

When a sale is completed, the quantities sold reduce the corresponding stock
according to inventory policy.

### BR-INV-002 — Purchase Increases Stock

When a purchase is completed, the purchased quantities increase the
corresponding stock.

### BR-INV-003 — Return Restores Stock

A valid sales return restores the returned quantities to inventory according
to the return policy.

### BR-INV-004 — Insufficient Stock

If selling more than the available quantity is not permitted, the sale must
fail with an insufficient-stock error.

Selling more than available stock is never permitted in the MVP. The command
must fail with `INSUFFICIENT_STOCK` and no invoice, payment, or inventory
movement may be committed.

### BR-INV-005 — Low Stock Threshold

If low-stock alerts are enabled and stock reaches or falls below the configured
threshold, the shop should receive a notification.

This is a Should capability.

---

## 6. Sales Rules

### BR-SALE-001 — Minimum One Item

A sales invoice cannot be confirmed without at least one item.

### BR-SALE-002 — Automatic Total Calculation

The invoice total must be calculated from its item values and applicable
pricing/discount rules.

### BR-SALE-003 — Discount Cannot Exceed Allowed Range

MVP supports a document-level **fixed** discount in minor units only. The
discount cannot make the invoice total negative. Percentage discounts are
explicitly deferred to a later iteration.

### BR-SALE-004 — Cash Payment

A fully cash-paid sale is considered settled and affects the relevant cash
state.

### BR-SALE-005 — Credit Sale

A credit sale increases the customer's outstanding balance when a customer is
associated.

### BR-SALE-006 — Mixed Payment

For a mixed payment, the unpaid remainder becomes the customer's outstanding
balance when the transaction is treated as credit.

### BR-SALE-007 — Sales Return

A valid return must correct the relevant inventory and customer/payment state
according to the portion returned.

### BR-SALE-008 — Return Time Restriction

A return older than the configured allowed period may require a warning or
Owner approval.

The current example is thirty days, with the period described as configurable.

---

## 7. Purchase Rules

### BR-PURCHASE-001 — Purchase Updates Inventory

A completed purchase increases stock for the purchased items.

### BR-PURCHASE-002 — Cash Purchase

A cash purchase decreases the relevant cash state.

### BR-PURCHASE-003 — Credit Purchase

A credit purchase increases the payable amount associated with the supplier.

---

## 8. Customer and Supplier Rules

### BR-CONTACT-001 — New Customer Starts at Zero

A newly created customer has an initial account balance of zero.

### BR-CONTACT-002 — New Supplier Starts at Zero

A newly created supplier should have no existing balance unless opening-balance
support is introduced.

### BR-CONTACT-003 — Duplicate Phone Handling

The current requirements reject creation of a duplicate customer phone number
within the relevant shop context.

The equivalent supplier rule is not explicitly defined.

### BR-CONTACT-004 — Account History

Customer account history must expose transactions with date, amount, and
balance according to the current requirements.

---

## 9. Cash and Banking Rules

### BR-CASH-001 — Receipt Increases Balance

A cash receipt increases the selected cash balance.

### BR-CASH-002 — Payment Decreases Balance

A cash payment decreases the selected cash balance.

### BR-CASH-003 — Insufficient Cash

A cash or card payment larger than the selected account's available balance
must fail. The transaction cannot be partially applied.

### BR-CASH-004 — Account Selection

Every cash and card payment row must reference an active financial account.
Credit rows do not require an account. When the Tenant has multiple financial
accounts, the user chooses the receiving/paying account per payment row.

---

## 10. Reporting Rules

### BR-REPORT-001 — Sales Report

A sales report can be filtered by a date range and should show:

- Total sales
- Number of invoices
- Average sale

### BR-REPORT-002 — Basic Profit and Loss

The current MVP definition is:

```text
Net Profit = Sales - Cost of Goods Sold - Expenses
```

Cost of Goods Sold is calculated from `InventoryMovement` using stock layers.
The Tenant chooses **FIFO** (default) or **LIFO** as the valuation method; the
method is configured at Tenant level and applies from the effective date
forward — historical calculations are never rewritten.

### BR-REPORT-003 — Debtors and Creditors

Customer debt and supplier payable information should be reportable according
to their account state.

### BR-REPORT-004 — Inventory Report

The inventory report should show current product quantities and monetary value.

This is a Should capability.

---

## 11. Subscription Rules

### BR-SUB-001 — Plan Limits

MVP only defines two plan labels: `FREE` and `PAID`. The only enforced limit
is an optional monthly count of confirmed invoices on the `FREE` plan; the
default during MVP development is **unlimited**. Billing provider, VAT, tax,
opening balances, fiscal periods, and online payments are explicitly out of
scope for MVP.

### BR-SUB-002 — Expired Paid Plan

When a paid plan expires, the platform may return the shop to the free plan or
require renewal according to the final subscription policy.

---

## 12. Accounting-Ready Rules

### BR-ACC-001 — Business Operations Are Primary

The basic business workflow must not require users to enter debit/credit
journal entries manually in the MVP.

### BR-ACC-002 — Accounting Must Be Extendable

Business operations should preserve enough semantic information for future
accounting posting.

### BR-ACC-003 — Accounting Does Not Redefine Operational State

Future accounting records must not become a hidden replacement for the
business domain concepts of sales, purchases, inventory, customers, and cash.

---

## 13. Approved MVP Rules

The following rules are approved for implementation:

- Sales cannot be confirmed when available stock is insufficient.
- Inventory quantity cannot become negative.
- Every stock change creates an immutable `InventoryMovement`.
- The Tenant chooses one inventory valuation method: `FIFO` or `LIFO`.
- The valuation method is configured at Tenant level and applies from the
  effective date forward; historical calculations are not rewritten.
- A confirmed financial document cannot be deleted or directly edited.
- Corrections, returns, reversals, and payment reversals are new linked
  records with an audit trail.
- Cash, card, credit, and mixed payments are supported in the MVP.
- A credit sale requires a Customer.
- Customer and Supplier balances are derived from immutable business and
  settlement transactions, not freely editable fields.
- Owner and Accountant may perform approved corrections, but neither may
  delete the original document.
- All monetary operations must use fixed decimal precision and one Tenant
  currency in the MVP.

The following remain product decisions for a later iteration: tax/VAT,
opening balances, fiscal periods, advanced accounting posting, and check
management.
