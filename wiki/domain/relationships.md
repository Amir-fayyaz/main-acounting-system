# Domain Relationships

## 1. Purpose

This document describes the relationships between the major domain concepts
identified by the current product requirements.

The relationships are conceptual. Cardinalities and database foreign keys
must be finalized during database design.

---

## 2. Tenant-Centered Ownership

The primary ownership rule is:

```text
Shop / Tenant
   |
   +-- Products
   +-- Categories
   +-- Customers
   +-- Suppliers
   +-- Sales Invoices
   +-- Purchase Invoices
   +-- Inventory
   +-- Cash / Bank Accounts
   +-- Payments
   +-- Expenses
   +-- Checks
```

This is the central domain boundary for shop-owned data.

---

## 3. User and Shop

Conceptually:

```text
User
  |
  +---- Owner ----------> Shop(s)
  |
  +---- Cashier --------> Shop
  |
  +---- Stock Keeper ---> Shop
  |
  +---- Super Admin ----> Platform
```

The requirements explicitly support an Owner owning multiple shops.

The exact relationship model for user memberships, role assignments, and
multi-shop users remains `TBD`.

---

## 4. Shop and Catalog

```text
Shop
 ├── Product / Service
 └── Product Category
          └── Products
```

A product belongs to one shop.

A product category belongs to one shop.

The same conceptual product barcode may exist in different shops; uniqueness
rules are tenant-scoped unless the product requirements later define a global
constraint.

---

## 5. Shop and Contacts

```text
Shop
 ├── Customer
 └── Supplier
```

Customers and suppliers are tenant-owned records.

A contact may participate in many transactions over time.

---

## 6. Sales Relationships

```text
Customer (optional)
        |
        v
Sales Invoice
        |
        +---- Invoice Item ----> Product / Service
        |
        +---- Payment(s)
        |
        +---- Return(s)
        |
        +---- Inventory Effect
        |
        +---- Customer Balance Effect
```

A sales invoice must contain at least one invoice item.

A customer reference may be optional for a sale, but credit transactions
require a customer according to the current requirements.

The exact requirement for customer association on cash/card sales is `TBD`.

---

## 7. Purchase Relationships

```text
Supplier
   |
   v
Purchase Invoice
   |
   +---- Invoice Item ----> Product / Service
   |
   +---- Payment(s)
   |
   +---- Inventory Effect
   |
   +---- Supplier Balance Effect
```

A credit purchase creates or increases an amount owed to the supplier.

---

## 8. Inventory Relationships

```text
Product
   |
   v
Inventory State
   |
   +---- Inventory Movement(s)
                ^
                |
       +--------+--------+
       |        |        |
      Sale    Purchase  Return
```

The current product requirements imply that sales, purchases, and returns
change inventory.

The exact source of truth between current stock and historical movements must
be decided before implementation.

---

## 9. Payment Relationships

A business transaction may have one or more payment effects.

Conceptually:

```text
Business Transaction
        |
        v
Payment
  ├── Cash
  ├── Card
  ├── Credit / Receivable
  └── Mixed allocation
```

The current requirements explicitly support mixed payment behavior for sales.

The exact payment-allocation model and whether payments are reusable across
sales, purchases, and account settlements remain `TBD`.

---

## 10. Customer Account Relationship

```text
Customer
   |
   +---- Credit Sale ----> Receivable Effect
   |
   +---- Payment --------> Receivable Reduction
   |
   +---- Account History
```

The customer account view must show transaction history, amounts, and running
balance according to the current requirements.

Whether this balance is materialized, derived from transactions, or eventually
backed by the accounting ledger is `TBD`.

---

## 11. Supplier Account Relationship

```text
Supplier
   |
   +---- Credit Purchase ----> Payable Effect
   |
   +---- Payment ------------> Payable Reduction
   |
   +---- Account History
```

The exact supplier account-history entity/model is `TBD`.

---

## 12. Cash and Banking

```text
Shop
  |
  +---- Cash Account
  |
  +---- Bank Account
           |
           +---- Transactions / Payments
```

The current requirements allow multiple cash/bank accounts as a Should
capability.

The final model must define how a payment selects its source/destination
account.

---

## 13. Reporting Relationships

Reporting is conceptually downstream from operational data.

```text
Sales -----------+
Purchases --------+
Inventory --------+----> Reporting
Customers --------+
Suppliers --------+
Cash/Bank --------+
Expenses ---------+
```

Reports should not become the source of truth for the underlying business
transactions.

---

## 14. Future Accounting Relationships

The future accounting capability should sit downstream from business events,
not replace the business domain itself.

Conceptually:

```text
Business Operation
        |
        v
Business Transaction / Effect
        |
        v
Accounting Event (future / TBD)
        |
        v
Journal Entry
        |
        v
Ledger
        |
        v
Accounting Reports
```

The exact mapping from business operation to accounting postings remains a
future domain decision.

---

## 15. Relationship Integrity Rules

The following relationship rules are currently implied by the requirements:

1. A tenant-owned resource must belong to exactly one tenant.
2. A product used by an invoice must belong to the same tenant as the invoice.
3. A customer used for a tenant's transaction must belong to that tenant.
4. A supplier used for a purchase must belong to that tenant.
5. Inventory effects must operate on products within the same tenant.
6. Payment effects must not reference accounts from another tenant.
7. A return must reference a sale that belongs to the same tenant.
8. Cross-tenant relationships are invalid.

---

## 16. Relationships Requiring Explicit Decisions

The following are intentionally unresolved:

- Whether one Customer can be both Customer and Supplier.
- Whether Product and Service share one entity/type model.
- Whether Sales Invoice and Purchase Invoice share one base document model.
- Whether Invoice Item is polymorphic or has separate sales/purchase models.
- Whether Payment is a generic settlement entity or transaction-specific.
- Whether Customer/Supplier balance is derived or stored.
- Whether inventory is balance-first or movement-first.
- Whether Return is an entity or a document/transaction subtype.
- Exact accounting-event relationships.
