# Domain Overview

## 1. Purpose

This document defines the conceptual domain of the Accounting SaaS platform.
It is the bridge between product requirements and technical implementation.

The domain is intentionally industry-agnostic and is centered on the daily
operations of individuals and small businesses.

The current domain combines:

- Sales
- Purchases
- Inventory
- Customers and suppliers
- Cash and banking
- Expenses
- Basic financial reporting
- Tenant-aware business operations

The domain must also remain ready for a future double-entry accounting
capability without forcing basic business users to interact with accounting
internals.

---

## 2. Domain Boundaries

The current conceptual domain can be grouped into the following areas:

```text
Identity & Access
        |
        v
Tenants / Shops
        |
        +----------------------+---------------------+
        |                      |                     |
        v                      v                     v
     Catalog                Contacts              Finance
        |                      |                     |
        v                      v                     v
    Inventory             Customer/Supplier     Cash / Bank
        |                                            |
        +----------------------+---------------------+
                               |
                               v
                         Sales / Purchases
                               |
                               v
                           Reporting
                               |
                               v
                     Future Accounting Engine
```

These are conceptual boundaries. Exact aggregate boundaries and module
ownership are defined later.

---

## 3. Core Domain Concepts

### 3.1 Shop / Tenant

A Shop is the business boundary under which shop-owned data is isolated.
For the current MVP model:

```text
1 Shop = 1 Tenant
```

### 3.2 User

A User represents an authenticated identity. A user may operate at platform
scope or shop scope depending on role.

### 3.3 Product / Service

A product or service is an item that can be used in business operations such
as sales and purchasing. Products may have pricing and inventory-related
information.

### 3.4 Customer

A customer is a business contact that may participate in sales and credit
transactions and may have an account balance/history.

### 3.5 Supplier

A supplier is a business contact that may participate in purchases and credit
transactions and may have an account balance/history.

### 3.6 Invoice

An invoice represents a business document for a sale or purchase. The current
requirements distinguish sales invoices and purchase invoices.

### 3.7 Invoice Item

An invoice item represents a line within an invoice and associates the
invoice with a product/service, quantity, and pricing information.

### 3.8 Payment

Payment represents money received or paid as part of a business transaction.
The current product explicitly supports cash, card, and credit payment types
for sales.

### 3.9 Inventory

Inventory represents the stock state of products and the movements that change
that state.

### 3.10 Cash / Bank Account

A cash or bank account represents a financial holding from which receipts and
payments are tracked.

### 3.11 Expense

An expense represents a business cost used by reporting and financial
management. The current User Stories refer to expenses but do not define the
full expense workflow yet.

### 3.12 Check

A check represents a future/optional payment instrument with a number, amount,
and due date.

### 3.13 Subscription Plan

A subscription plan represents the platform-level commercial plan assigned to
a shop, such as free or paid.

---

## 4. Domain Design Principles

### 4.1 Tenant-Owned Data Is Explicit

Shop-owned entities must have an explicit tenant owner.

### 4.2 Business Operations Are the Primary User Model

The domain should expose concepts that are understandable to business owners.

### 4.3 Accounting Is a Separate Capability

Business transactions must not require direct interaction with double-entry
bookkeeping concepts in the MVP.

### 4.4 State Changes Must Have Defined Effects

Operations such as confirming a sale or purchase may change multiple areas of
the business state, such as inventory, balances, or cash.

### 4.5 Historical Business Data Must Be Traceable

Financially meaningful operations should remain attributable to the relevant
business transaction and actor.

---

## 5. Domain Invariants Currently Supported

The existing requirements support the following invariants:

1. Shop-owned data belongs to one tenant.
2. A shop-level user may operate only within authorized shop scope.
3. A sales invoice must contain at least one item.
4. Sales and purchases affect inventory according to their direction.
5. A customer may accumulate a receivable balance from credit sales.
6. A supplier may accumulate a payable balance from credit purchases.
7. A completed cash transaction affects the relevant cash state.
8. Profit/loss reporting is derived from sales, cost of goods sold, and
   expenses according to the currently defined simplified formula.
9. Historical data should remain intact when a shop is deactivated.

---

## 6. Domain Areas Requiring Further Definition

The following are deliberately not finalized here:

- Exact aggregate boundaries
- Exact entity attributes
- Invoice status model
- Exact payment allocation model
- Expense workflow
- Exact inventory movement model
- Cost valuation method
- Accounting event model
- Double-entry posting rules
- Fiscal periods
- Tax model
- Currency model
- Document numbering strategy

These must be resolved before database implementation where they affect the
source of truth or business invariants.
