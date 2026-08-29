# Entity Catalog

## 1. Purpose

This document catalogs the domain entities currently supported by the product
requirements.

It is a conceptual entity catalog, not yet a final database schema. Fields,
keys, indexes, and persistence details belong to the Data Architecture and
Database Design documentation.

Where the current requirements do not define a detail, it is marked `TBD`.

---

## 2. Platform and Identity Entities

### 2.1 User

Represents an authenticated platform user.

Known responsibilities:

- Registration
- Login
- Role assignment
- Access to authorized shop(s)
- Account activation/deactivation

Known roles:

- Super Admin
- Owner
- Cashier
- Stock Keeper

Important relationships:

```text
User ↔ Shop
User → Role
```

Exact user/shop membership structure: `TBD`.

---

### 2.2 Shop / Tenant

Represents an independent business using the SaaS platform.

Known responsibilities:

- Business identity
- Shop status
- Shop configuration
- Tenant boundary
- Subscription association

Known shop information includes:

- Name
- Business type
- Address
- Logo
- Status

Exact business profile fields: `TBD`.

---

### 2.3 Role

Represents an authorization role.

The current product defines four roles but does not require a dedicated
persisted Role entity; implementation may use another representation.

Roles:

- Super Admin
- Owner
- Cashier
- Stock Keeper

---

### 2.4 Subscription Plan

Represents the commercial plan available to a shop.

Known examples:

- Free
- Paid

Known behavior:

- Plans may have usage limitations.
- A shop may move between plans.
- An expired paid plan may return to free or trigger renewal behavior.

Exact billing/subscription entities: `TBD`.

---

## 3. Catalog Entities

### 3.1 Product / Service

Represents an item that can participate in sales or purchasing.

Known information includes:

- Name
- Code/barcode
- Unit of measure
- Purchase price
- Sales price
- Initial/current stock-related state
- Low-stock threshold (Should)
- Category (Should)

Tenant scope: Shop-owned.

---

### 3.2 Product Category

Represents a classification used to organize products.

Tenant scope: Shop-owned.

Known rule:

- A category associated with products cannot simply be deleted without
  handling its existing associations.

---

## 4. Contact Entities

### 4.1 Customer

Represents a customer of the shop.

Known information includes:

- Name
- Phone/contact information
- Account balance
- Transaction history

Tenant scope: Shop-owned.

Known relationships:

```text
Customer → Sales Invoices
Customer → Payments / Account Transactions
```

Exact account-ledger representation: `TBD`.

---

### 4.2 Supplier

Represents a supplier of the shop.

Known information includes:

- Name
- Phone/contact information
- Account balance/history

Tenant scope: Shop-owned.

Known relationships:

```text
Supplier → Purchase Invoices
Supplier → Payments / Account Transactions
```

Exact account-ledger representation: `TBD`.

---

## 5. Sales and Purchase Entities

### 5.1 Sales Invoice

Represents a sale made by the shop.

Known behavior:

- Contains one or more items.
- Calculates a total.
- May have a discount.
- May reference a customer.
- May be paid by cash, card, credit, or a combination according to the
  requirements.
- May result in a customer receivable.
- May reduce inventory.
- May be returned fully or partially.

Tenant scope: Shop-owned.

Exact invoice status lifecycle: `TBD`.

---

### 5.2 Purchase Invoice

Represents a purchase made by the shop from a supplier.

Known behavior:

- Contains purchased items.
- Increases inventory.
- May be paid immediately or on credit.
- A credit purchase increases the supplier payable balance.

Tenant scope: Shop-owned.

Exact invoice status lifecycle: `TBD`.

---

### 5.3 Invoice Item

Represents an individual line within a sales or purchase invoice.

Known information includes:

- Product/service reference
- Quantity
- Unit price
- Line amount
- Potential discount information

The exact shared model between sales and purchase items is `TBD`.

---

### 5.4 Return

A return represents reversal of all or part of a previously recorded sale.

The current requirements describe full and partial sales returns.

Whether Return is modeled as a first-class entity or as a specialized
transaction/document remains `TBD`.

---

## 6. Inventory Entities

### 6.1 Inventory Balance / Stock State

Represents the current stock quantity for a product in a shop.

Tenant scope: Shop-owned.

Known effects:

- Sale decreases stock.
- Purchase increases stock.
- Return may increase stock.

Exact source-of-truth representation: `TBD`.

---

### 6.2 Inventory Movement

Represents a stock change caused by a business operation.

Examples from current requirements:

- Sale movement
- Purchase movement
- Return movement

This concept is important for auditability and historical reconstruction.

Exact movement fields and valuation rules: `TBD`.

---

## 7. Financial Entities

### 7.1 Cash Account

Represents a cash holding used by the shop.

Known operations:

- Cash receipt
- Cash payment
- Cash balance tracking

Tenant scope: Shop-owned.

---

### 7.2 Bank Account

Represents a bank account used by the shop.

The current requirements support multiple cash/bank accounts as a Should
capability.

Tenant scope: Shop-owned.

---

### 7.3 Payment

Represents a financial movement associated with a transaction.

Known payment concepts include:

- Cash
- Card
- Credit / receivable
- Mixed payment

Exact payment allocation model: `TBD`.

---

### 7.4 Cash Transaction

Represents an explicit cash receipt or cash payment entered by the Owner.

Whether this is a specialized form of Payment or a separate entity is `TBD`.

---

### 7.5 Expense

Represents a business expense.

Expenses are referenced by the profit/loss report requirements, but the current
User Stories do not define a complete expense-management workflow.

Known fact:

```text
Net Profit = Sales - Cost of Goods Sold - Expenses
```

Exact expense attributes, workflow, and source-of-truth model: `TBD`.

---

### 7.6 Check

Represents a check that may be received or issued.

Known fields:

- Check number
- Amount
- Due date
- Status/list membership

This capability is currently Could.

---

## 8. Future Accounting Entities

These are not required as full user-facing MVP entities, but the architecture
should remain compatible with them.

### 8.1 Account

Future chart-of-accounts account.

### 8.2 Journal

Future accounting journal.

### 8.3 Journal Entry

Future debit/credit accounting entry.

### 8.4 Ledger

Future account ledger / posted accounting history.

### 8.5 Accounting Event

A potential intermediate concept connecting business operations to future
accounting postings.

The existence and exact structure of Accounting Event remains `TBD`.

---

## 9. Entity Status Summary

| Entity             | Scope           | MVP Status                | Source of Truth Status |
| ------------------ | --------------- | ------------------------- | ---------------------- |
| User               | Platform        | Must                      | Defined conceptually   |
| Shop/Tenant        | Platform/Tenant | Must                      | Defined conceptually   |
| Role               | Platform/Tenant | Must                      | Defined conceptually   |
| Subscription Plan  | Platform/Tenant | Should                    | Partial                |
| Product/Service    | Tenant          | Must                      | Defined conceptually   |
| Product Category   | Tenant          | Should                    | Defined conceptually   |
| Customer           | Tenant          | Must                      | Defined conceptually   |
| Supplier           | Tenant          | Must                      | Defined conceptually   |
| Sales Invoice      | Tenant          | Must                      | Defined conceptually   |
| Purchase Invoice   | Tenant          | Must                      | Defined conceptually   |
| Invoice Item       | Tenant          | Must                      | Defined conceptually   |
| Return             | Tenant          | Should                    | Partial                |
| Inventory Balance  | Tenant          | Must                      | Not finalized          |
| Inventory Movement | Tenant          | Implied / architectural   | Not finalized          |
| Cash Account       | Tenant          | Must/Should depending use | Partial                |
| Bank Account       | Tenant          | Should                    | Partial                |
| Payment            | Tenant          | Must                      | Partial                |
| Cash Transaction   | Tenant          | Must                      | Partial                |
| Expense            | Tenant          | Required by reporting     | Partial                |
| Check              | Tenant          | Could                     | Partial                |
| Accounting Account | Tenant          | Future                    | Future                 |
| Journal Entry      | Tenant          | Future                    | Future                 |
| Ledger             | Tenant          | Future                    | Future                 |
