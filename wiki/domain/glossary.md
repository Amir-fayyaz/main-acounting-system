# Domain Glossary

## 1. Purpose

This glossary establishes consistent terminology for the product and the
technical documentation.

The same term should not be used with different meanings across product,
domain, API, and database documentation.

---

## 2. Core Terms

| Term                 | Definition                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| Platform             | The complete SaaS application and its global infrastructure.                                             |
| Tenant               | The logical isolation boundary for one shop/business.                                                    |
| Shop                 | The business/store represented by a tenant in the current MVP model.                                     |
| User                 | An authenticated identity that may operate on the platform or a shop.                                    |
| Owner                | A shop-level user responsible for managing one or more shops.                                            |
| Accountant           | A Tenant employee with operational and financial/accounting permissions, excluding ownership changes and deletion of financial documents. |
| Cashier              | A shop-level user focused primarily on sales operations.                                                 |
| Stock Keeper         | A shop-level user focused on inventory operations.                                                       |
| Super Admin          | A platform-level administrator who manages platform operations rather than ordinary shop financial data. |
| Product              | A sellable or purchasable item with pricing and potentially inventory.                                   |
| Service              | A non-stock or service-type item that can participate in business transactions.                          |
| Category             | A shop-owned classification for products.                                                                |
| Customer             | A party that buys from the shop and may have a receivable/account balance.                               |
| Supplier             | A party that sells to the shop and may have a payable/account balance.                                   |
| Sales Invoice        | A document recording a sale to a customer or general sale transaction.                                   |
| Purchase Invoice     | A document recording a purchase from a supplier.                                                         |
| Invoice Item         | A line within an invoice representing a product/service, quantity, and price.                            |
| Return               | Reversal of all or part of a previously recorded sale.                                                   |
| Payment              | A movement of money or settlement state associated with a business transaction.                          |
| Cash Account         | A shop-owned account representing cash funds.                                                            |
| Bank Account         | A shop-owned bank account used to track financial movements.                                             |
| Expense              | A business cost used in financial management and reporting.                                              |
| Inventory            | The shop's stock state and/or the history of stock movements.                                            |
| Inventory Movement   | A recorded change in stock caused by a business event.                                                   |
| Stock Balance        | The current quantity available for a product.                                                            |
| Check                | A payment instrument with a number, amount, and due date.                                                |
| Subscription Plan    | A platform-level commercial plan assigned to a shop.                                                     |
| Business Transaction | A meaningful business operation such as a sale, purchase, or payment.                                    |
| Financial Effect     | The money/balance consequence of a business transaction.                                                 |
| Accounting Event     | A future concept connecting business effects to double-entry posting.                                    |
| Journal Entry        | A future accounting record containing debit/credit postings.                                             |
| Ledger               | A future accounting history grouped by account.                                                          |
| Tenant Context       | The validated shop scope under which a shop-level operation executes.                                    |
| Role                 | A set of permissions representing an actor's responsibilities.                                           |
| Permission           | An authorization capability granted to a role or user.                                                   |

---

## 3. Terminology Rules

### 3.0 Accountant

An Accountant is an active MVP Tenant employee role with operational and
financial/accounting permissions. The Accountant cannot change Tenant
ownership or delete financial documents.

### 3.1 Shop vs Tenant

Use `Shop` when discussing the business concept visible to users.

Use `Tenant` when discussing the isolation/security boundary.

For the MVP:

```text
1 Shop = 1 Tenant
```

### 3.2 User vs Customer

A `User` can authenticate to the application.

A `Customer` is a business party recorded in the application's operational
data.

A customer does not automatically become an application user.

### 3.3 Supplier vs User

A `Supplier` is a business party from whom the shop purchases.

A supplier is not automatically an application user.

### 3.4 Payment vs Cash Transaction

`Payment` is the broader financial-settlement concept.

`Cash Transaction` refers specifically to an explicit cash receipt or payment
operation until the final financial domain model is defined.

### 3.5 Balance vs Ledger

A `Balance` is a current amount relevant to a business relationship or account.

A `Ledger` is a future accounting concept representing a structured history of
account postings.

A current MVP balance must not automatically be treated as a full double-entry
ledger.

---

## 4. Accounting Terminology

The MVP should avoid requiring these terms from ordinary users:

- Debit
- Credit
- Journal Entry
- General Ledger
- Trial Balance
- Chart of Accounts

These belong to the future professional accounting capability unless a later
product decision promotes them into the user-facing MVP.

---

## 5. Naming Conventions for Documentation

Use the following terms consistently:

```text
Shop       → business/tenant concept
Tenant     → isolation/security concept
Sales      → outgoing customer-side transaction
Purchase   → incoming supplier-side transaction
Invoice    → business document
Payment    → settlement/financial movement
Inventory  → stock state + movement concept
Expense    → business cost
Accounting → double-entry/ledger capability
```

---

## 6. Terms Requiring Product Decisions

The following terminology is not yet final:

- Store vs Shop naming in the UI/API
- Product vs Item
- Service as a subtype vs separate entity
- Invoice vs Document
- Return vs Credit Note
- Expense vs Payment/Disbursement
- Customer balance vs Receivable
- Supplier balance vs Payable
- Cash account vs Cashbox
- Bank account vs Financial account
- Shop vs Business if the product later supports businesses containing multiple
  shops
