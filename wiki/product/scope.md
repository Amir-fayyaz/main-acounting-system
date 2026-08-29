# Product Scope

## 1. Purpose

This document defines the functional scope of the initial product and
separates capabilities into:

- Must Have
- Should Have
- Could Have
- Out of Scope / Future

The primary source for the current scope is the existing MVP User Story
document. Story-level priorities are preserved as the authoritative detail
for this document.

---

## 2. MVP Scope

The MVP is focused on the core capabilities required by a small business to
run its day-to-day sales, purchasing, inventory, customer/supplier, cash, and
basic reporting operations.

The MVP also includes multi-tenant isolation as a mandatory architectural
requirement.

### 2.1 Must Have

#### Identity, Users, and Shops

- US-1.1 — Register shop owner
- US-1.2 — Login
- US-1.3 — Shop settings
- US-1.4 — Create limited-access user accounts
- US-1.5 — Super Admin shop list
- US-1.6 — Activate/deactivate shop
- US-1.9 — Tenant isolation

#### Products and Inventory

- US-2.1 — Product/service definition
- US-2.3 — Fast product search
- US-2.4 — Automatic stock updates

#### Sales

- US-3.1 — Create sales invoice
- US-3.3 — Select payment type

#### Purchases

- US-4.1 — Record purchase invoice

#### Customers and Suppliers

- US-5.1 — Define customer/supplier
- US-5.2 — Customer account history

#### Cash and Banking

- US-6.1 — Record cash in/out

#### Reporting

- US-7.1 — Daily/monthly sales report
- US-7.2 — Basic profit and loss report
- US-7.4 — Debtors and creditors report

#### Dashboard

- US-8.1 — Financial summary dashboard

---

## 3. Should Have

These capabilities are important to the product, but the initial release can
operate without them.

### 3.1 Identity, Users, and Shops

- US-1.7 — Shop subscription plan management
- US-1.8 — Switching between multiple shops for an owner

### 3.2 Products and Inventory

- US-2.2 — Product categories
- US-2.5 — Low-stock alerts

### 3.3 Sales

- US-3.2 — Apply discounts
- US-3.4 — Print/send invoice
- US-3.5 — Sales returns

### 3.4 Cash and Banking

- US-6.2 — Multiple cash/bank accounts

### 3.5 Reporting

- US-7.3 — Inventory report

---

## 4. Could Have

These capabilities are useful enhancements but are not required for the first
usable product.

### 4.1 Customers and Suppliers

- US-5.3 — Payment reminders

### 4.2 Cash and Banking

- US-6.3 — Check management

---

## 5. MVP Accounting Boundary

The MVP provides business-facing financial operations without requiring all
users to interact directly with a professional double-entry accounting model.

The initial experience is centered around business operations such as:

- Sales
- Purchases
- Payments
- Receipts
- Expenses
- Customer balances
- Supplier balances
- Cash and bank balances
- Basic profit and loss reporting

At the same time, the architecture must remain ready for a future accounting
engine based on double-entry bookkeeping.

Future accounting capabilities may include:

- Chart of Accounts
- Journal Entries
- Debit / Credit
- General Ledger
- Trial Balance
- Accounting adjustments
- Advanced financial reports

These capabilities are not part of the initial user-facing MVP scope.

---

## 6. Multi-Tenancy Scope

Tenant isolation is not treated as an optional or future capability.

It is part of the initial MVP architecture.

The current product requirements define the following principles:

- Transactional and shop-owned data must carry tenant/shop ownership.
- Queries must be automatically constrained by the active tenant.
- Store-level users must operate within the scope of their permitted shop(s).
- An owner may have access to multiple shops.
- Super Admin has platform-level management access but does not access normal
  shop financial data through ordinary tenant APIs.
- Any exceptional support access must be provided through a separate,
  controlled, and fully audited mechanism.

The current MVP database strategy described by the product requirements is:

> Shared Database, Shared Schema with a `shop_id` column for shop-owned data.

This strategy may be refined during the architecture phase, but tenant
isolation remains a hard requirement regardless of the final infrastructure
implementation.

---

## 7. MVP Non-Goals

The following are intentionally outside the initial product scope:

### 7.1 Enterprise ERP

The product is not initially intended to provide a full enterprise ERP suite.

### 7.2 Industry-Specific Workflows

The product must remain generic and should not introduce workflows that assume
a specific industry.

### 7.3 Full Professional Accounting UI

The MVP does not require exposing the complete double-entry accounting
workflow to all users.

### 7.4 Advanced Accounting

The following are future capabilities unless explicitly promoted into a later
release:

- Full chart of accounts management
- Professional journal-entry interface
- General ledger UI
- Trial balance UI
- Advanced accounting adjustments
- Advanced accounting reports

### 7.5 Advanced Operational Domains

The current requirements do not define dedicated MVP scope for:

- Manufacturing
- Complex supply-chain management
- Advanced procurement
- Enterprise resource planning
- Other industry-specific modules

These should not be added to the core domain until they are explicitly
defined as product requirements.

---

## 8. Release Prioritization

The implementation order should prioritize foundational capabilities first.

### Phase 1 — Foundation

- Authentication
- User and shop model
- Roles and permissions
- Tenant context
- Tenant isolation
- Core product/customer/supplier entities

### Phase 2 — Core Operations

- Product and inventory management
- Sales
- Purchases
- Payments and receipts
- Customer/supplier balances

### Phase 3 — Core Reporting

- Sales reporting
- Basic profit and loss
- Debtors/creditors reporting
- Dashboard

### Phase 4 — Secondary Features

- Categories
- Low-stock alerts
- Discounts
- Invoice printing/sending
- Returns
- Multiple cash/bank accounts
- Inventory reporting
- Subscription management
- Multi-shop switching

### Phase 5 — Future Enhancements

- Payment reminders
- Check management
- Professional accounting capabilities
- Other advanced features defined by future product requirements

---

## 9. Scope Rules

The following rules apply whenever new features are proposed:

1. A feature must belong to a clearly defined business capability.
2. A feature must have an identified actor and business outcome.
3. Tenant ownership must be explicit for shop-level data.
4. Financial side effects must be documented before implementation.
5. Inventory side effects must be documented before implementation.
6. Authorization requirements must be defined before implementation.
7. Features that introduce industry-specific behavior must be treated as
   explicit product decisions, not hidden assumptions.
8. Future accounting functionality must extend the accounting boundary rather
   than forcing business modules to expose accounting internals.

---

## 10. Source and Priority Notes

The current User Story source contains a detailed priority on each story as well
as a final summary table.

The story-level priorities and the final summary table are not fully
consistent.

For example, the detailed stories mark US-1.9 (Tenant Isolation) as Must,
while the final summary table reports a different Must/Should/Could
distribution for the Users and Shops epic.

Therefore:

- This document preserves the priority assigned to each individual story.
- The final summary table from the source should not be treated as the
  authoritative count until it is reconciled.
- No story priority is silently changed as part of this documentation work.

A later backlog-reconciliation step should produce the canonical numerical
summary for release planning.
