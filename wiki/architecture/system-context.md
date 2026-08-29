# System Context

## 1. Purpose

This document defines the external actors, external systems, and major
boundaries surrounding the Accounting SaaS platform.

The goal is to establish a shared understanding of what the platform is
responsible for and what responsibilities belong to external actors or
services.

This document intentionally stays at the system-context level. Detailed
module architecture, database design, tenant isolation, API contracts, and
business workflows are documented separately.

---

## 2. System Context Overview

The product is a multi-tenant SaaS platform used by individuals, small
businesses, small companies, and accountants.

At the center of the context is the Accounting SaaS Platform:

```text
                         +----------------------+
                         |      Super Admin     |
                         |   Platform Operator  |
                         +----------+-----------+
                                    |
                                    v
+----------------+          +---------------------------+          +------------------+
|    Owner       |--------->|                           |<---------|    Cashier       |
|   / Business   |          |    Accounting SaaS        |          |   Shop User      |
+----------------+          |       Platform            |          +------------------+
                            |                           |
+----------------+          |  Multi-Tenant Business   |          +------------------+
| Stock Keeper   |--------->|  Accounting & Management  |<---------|    Accountant    |
|   Shop User   |          |                           |          |   (future/full)  |
+----------------+          +-------------+-------------+          +------------------+
                                          |
                    +---------------------+----------------------+
                    |                     |                      |
                    v                     v                      v
             +-------------+       +-------------+        +-------------+
             | SMS / Email |       | File / PDF  |        | Payment     |
             | Providers   |       | Storage     |        | Providers   |
             +-------------+       +-------------+        +-------------+
```

The external services shown above are architectural possibilities based on
current product requirements. Their exact providers and integration strategy
are not yet defined.

---

## 3. Primary Actors

### 3.1 Owner

The Owner is the primary business actor.

Responsibilities include:

- Managing one or more shops
- Configuring shop information
- Managing shop users
- Managing products and services
- Managing customers and suppliers
- Recording purchases
- Managing cash and financial operations
- Viewing business and financial reports

An Owner operates within the scope of shops they own or are authorized to
manage.

---

### 3.2 Cashier

The Cashier is a shop-level operational user focused primarily on sales.

The current requirements explicitly support:

- Authentication
- Product search
- Sales invoice creation
- Payment type selection

The requirements also explicitly prohibit access to the profit and loss report
for this role.

Other Cashier permissions remain to be finalized.

---

### 3.3 Stock Keeper

The Stock Keeper is a shop-level operational user focused on inventory.

The current requirements identify this role as responsible for inventory
management, but do not fully define its permission matrix.

Stock Keeper is an MVP Tenant employee who manages stock visibility and
inventory movements only. The approved permissions are defined in
`product/roles-and-permissions.md`.

---

### 3.4 Super Admin

The Super Admin is a platform-level actor.

Responsibilities include:

- Viewing registered shops
- Searching/filtering shops
- Activating/deactivating shops
- Managing shop subscription plans

The Super Admin does not have ordinary access to shop financial data.

Exceptional support access, if introduced, must use a separate controlled and
audited mechanism.

---

### 3.5 Accountant

An Accountant is an MVP Tenant employee with full operational and financial
workflows, including customers, suppliers, sales, purchases, payments,
expenses, reports, and approved corrections.

The product is intentionally designed to remain usable by business owners
without requiring professional accounting knowledge.

The architecture is also intended to support a future professional accounting
experience based on double-entry bookkeeping.

Accountant cannot change Tenant ownership or delete financial documents.

---

## 4. External Systems

### 4.1 SMS / Messaging Provider

The current product requirements include SMS-based flows, including:

- Registration verification code
- Potential invoice delivery
- Notifications and reminders

The platform is responsible for deciding when a message should be sent and
for recording the relevant business event.

The external provider is responsible for message delivery.

The exact provider, API contract, failure handling, and delivery guarantees are
not yet defined.

---

### 4.2 Email Provider

Email delivery may be used for future or additional notification and document
delivery flows.

No specific email provider is currently defined.

This integration should remain behind an infrastructure boundary so that the
business domain does not depend on a specific provider.

---

### 4.3 File / PDF Storage

The product includes printable/PDF invoices.

The platform therefore needs a mechanism for generating and/or storing invoice
documents.

The exact storage strategy is not yet defined.

The business domain should treat document generation/storage as an external
infrastructure concern rather than embedding storage-provider details into
invoice business logic.

---

### 4.4 Payment Provider

The current product requirements distinguish payment types such as cash, card,
and credit.

The existence of an external payment gateway is not required by the current
MVP User Stories.

Therefore:

- Cash/card/credit are currently business payment concepts.
- A third-party online payment gateway is not part of the defined MVP scope.
- Any future gateway integration should be introduced as an external
  infrastructure capability.

---

### 4.5 Barcode Scanner

The sales workflow supports barcode scanning.

From a system-context perspective, the scanner is treated as a client-side
input device rather than a core external backend system.

The platform receives the scanned product/barcode value and performs the
product lookup.

No dedicated backend integration is required solely for a standard barcode
scanner unless future hardware requirements introduce one.

---

## 5. Internal System Boundary

The Accounting SaaS Platform is responsible for:

### Identity

- User accounts
- Authentication
- Role assignment
- Access control

### Tenant Management

- Shop identity
- Shop lifecycle
- User-to-shop relationships
- Active shop context
- Tenant isolation

### Business Operations

- Products/services
- Inventory
- Sales
- Purchases
- Customers
- Suppliers
- Cash and banking
- Expenses

### Financial State

- Customer balances
- Supplier balances
- Cash/bank state
- Basic profit and loss calculations

### Reporting

- Operational reports
- Sales reports
- Inventory reports
- Debtors/creditors reports
- Basic financial reports

### Platform Management

- Shop administration
- Subscription plans
- Platform-level controls

---

## 6. What Is Outside the Core System Boundary

The following are not core responsibilities of the domain itself:

- SMS delivery infrastructure
- Email delivery infrastructure
- Physical barcode scanner hardware
- File storage provider
- PDF rendering infrastructure
- External payment gateway infrastructure
- Cloud infrastructure
- Database engine internals

The platform may depend on these services or technologies, but their
implementation details should remain outside the core business domain.

---

## 7. Actor-to-System Interaction

| Actor        | Primary Interaction                                           |
| ------------ | ------------------------------------------------------------- |
| Owner        | Manage business operations, financial activities, and reports |
| Cashier      | Perform sales and invoice operations                          |
| Stock Keeper | Perform inventory operations                                  |
| Super Admin  | Manage platform-level shop and subscription operations        |
| Accountant   | Future professional accounting workflows                      |

---

## 8. System-to-System Interaction

| External System | Direction           | Purpose                                       |
| --------------- | ------------------- | --------------------------------------------- |
| SMS Provider    | Platform → Provider | OTPs, notifications, invoice-related messages |
| Email Provider  | Platform → Provider | Notifications and future document delivery    |
| File Storage    | Platform ↔ Storage  | Invoice/PDF document storage                  |
| Payment Gateway | Future              | Online payment processing                     |
| Barcode Scanner | Client → Platform   | Barcode input for product lookup              |

These integrations should be accessed through infrastructure adapters rather
than directly from business/domain code.

---

## 9. Tenant Context at the System Boundary

Tenant context begins when a shop-level user interacts with the platform.

A typical request conceptually follows:

```text
Client
  ↓
Authentication
  ↓
Identity
  ↓
Role / Permission
  ↓
Tenant Context
  ↓
Application Use Case
  ↓
Domain Operation
  ↓
Tenant-Scoped Data
```

The platform must never assume that a user having a valid role automatically
grants access to every shop.

Tenant membership/ownership and resource ownership must also be evaluated.

The detailed implementation of tenant context is documented separately in:

```text
docs/02-architecture/multi-tenancy.md
```

---

## 10. System Context Principles

### Principle 1 — Business Domain First

The core domain represents business concepts and rules.

External services should not define or own the business meaning of a
transaction.

### Principle 2 — Infrastructure Isolation

External providers should be replaceable without changing business rules.

For example, changing an SMS provider should not require changes to the sale,
customer, or authentication domain models.

### Principle 3 — Explicit Boundaries

Every dependency crossing the system boundary should be explicit.

### Principle 4 — No Hidden Tenant Access

No external integration or internal administrative mechanism should bypass
tenant-security rules implicitly.

### Principle 5 — Future-Proof Accounting

The system boundary must allow the future accounting subsystem to become more
capable without forcing users of basic business operations to interact
directly with accounting internals.

---

## 11. Open Questions

The following items remain intentionally undefined:

1. Exact SMS provider.
2. Exact email provider.
3. Exact file/PDF storage solution.
4. Whether online payment gateway integration will be introduced.
5. Exact accountant role and permission model.
6. Exact integration mechanism for notifications.
7. Whether document files are stored persistently or generated on demand.
8. Failure/retry policy for external providers.
9. Observability and audit requirements for external integrations.

These should be resolved in the relevant architecture, security, and
operations documents rather than being assumed here.
