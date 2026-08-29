# Product Overview

## 1. Product Definition

This product is a SaaS-based business accounting and management platform
designed for individuals, small businesses, and small companies.

The platform is industry-agnostic and is not designed around a specific
business category such as grocery stores, clothing stores, or pharmacies.

The primary goal is to provide a simple and accessible system that helps
small businesses manage their day-to-day financial and operational activities
without requiring them to operate a complex enterprise accounting system.

The platform follows a multi-tenant SaaS model where multiple independent
businesses operate on the same platform and infrastructure while their data
remains strictly isolated.

---

## 2. Target Users

The primary target users are:

- Individuals running small businesses
- Small retail and service businesses
- Small companies
- Business owners who need simple financial and operational management
- Accountants who manage the financial records of small businesses

The system should be usable by a non-technical business owner while also
providing an architecture that can support more advanced accounting
capabilities for professional accountants.

---

## 3. Product Vision

The product aims to provide a simple, affordable, and scalable business
management platform for small businesses.

The system should allow a business owner to manage essential daily operations
such as:

- Sales
- Purchases
- Products and inventory
- Customers
- Suppliers
- Cash and bank accounts
- Payments and receipts
- Expenses
- Financial and operational reports

The platform should start with a simple user experience and gradually support
more advanced accounting capabilities without requiring a fundamental rewrite
of the core business domain.

---

## 4. Product Principles

### 4.1 Simple by Default

The system should expose business concepts in a way that is understandable to
business owners who do not have a strong accounting background.

Users should be able to perform common operations such as recording a sale,
purchase, payment, or expense without being required to understand accounting
concepts such as debits, credits, journals, or ledgers.

### 4.2 Accounting-Ready Architecture

Although the initial product experience is intentionally simplified, the
underlying architecture must remain compatible with a future double-entry
accounting engine.

Business modules should therefore avoid tightly coupling themselves to a
specific accounting presentation or implementation.

Future accounting capabilities should be introducible without requiring a
rewrite of the core business modules.

### 4.3 Multi-Tenant by Design

The platform is fundamentally multi-tenant.

Every business operates as an independent tenant and must only be able to
access data belonging to that tenant.

Tenant isolation is an architectural requirement and must not be treated as
an optional feature added later.

### 4.4 Industry Agnostic

The domain model should represent generic business concepts rather than
industry-specific rules.

For example, the system should model concepts such as:

- Product
- Service
- Customer
- Supplier
- Invoice
- Payment
- Inventory
- Expense

without assuming a particular industry.

### 4.5 Accessible to Small Businesses

The system should prioritize affordability and ease of use.

The initial product is intended to provide a free usage path for small
businesses, while the architecture should support future paid plans and
subscription limits.

---

## 5. Product Scope at a High Level

The initial product covers the following business capabilities:

### Sales

- Sales invoices
- Invoice items
- Discounts
- Payment types
- Returns

### Purchases

- Purchase invoices
- Supplier transactions
- Inventory updates
- Purchase payments

### Inventory

- Products and services
- Categories
- Stock levels
- Stock movements
- Low-stock notifications

### Contacts

- Customers
- Suppliers
- Customer balances
- Supplier balances

### Cash and Banking

- Cash accounts
- Bank accounts
- Receipts
- Payments
- Checks

### Reporting

- Sales reports
- Inventory reports
- Customer debt reports
- Basic profit and loss reporting

### Platform Management

- User management
- Store management
- Roles and permissions
- Multi-tenant isolation
- Subscription plans

---

## 6. Accounting Scope

The initial product should provide simplified business-facing financial
functionality.

The first version does not require exposing a full professional double-entry
accounting interface to every user.

However, the system should preserve a clear architectural boundary for
accounting so that a future version can introduce capabilities such as:

- Chart of Accounts
- Journal Entries
- Debit / Credit
- General Ledger
- Trial Balance
- Accounting adjustments
- Advanced financial reports

The accounting engine is therefore considered a future capability that the
current business domain must be prepared to support.

---

## 7. Non-Goals

The following are not primary goals of the initial product:

- Enterprise-grade ERP functionality
- Industry-specific accounting workflows
- Complex manufacturing management
- Large-scale supply chain management
- Full enterprise accounting configuration
- Requiring professional accounting knowledge for basic operations

These capabilities may be considered in future versions but are outside the
initial product scope.

---

## 8. Success Criteria

The initial product should allow a small business to independently manage
its essential daily operations from a single platform.

A business owner should be able to:

1. Create and manage their business.
2. Add products and services.
3. Manage customers and suppliers.
4. Record sales and purchases.
5. Track inventory.
6. Record receipts, payments, and expenses.
7. Monitor outstanding customer and supplier balances.
8. View basic financial and operational reports.

At the same time, the system architecture must provide a stable foundation
for future professional accounting capabilities and additional SaaS features.
