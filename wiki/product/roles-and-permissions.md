# Roles and Permissions

## 1. Purpose

This document defines the actors currently identified for the platform and
the authorization boundaries that are explicitly supported by the product
requirements.

The permission model is intentionally documented conservatively.

Where the current requirements do not explicitly define a permission, the
permission is marked as `TBD` rather than being inferred from the role name.

This document is the functional authorization baseline. Detailed
implementation rules for guards, policies, JWT claims, and tenant context
belong to the architecture and security documentation.

---

## 2. Roles

The MVP has five roles: `Super Admin`, `Owner`, `Accountant`, `Cashier`, and
`Stock Keeper`. Accountant is a Tenant employee role, not a future-only role.

The current product requirements define four roles.

| Role         | Scope             | Description                                                                                                     |
| ------------ | ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Super Admin  | Platform / Global | Manages shops and subscription plans. Does not have direct access to shop financial data through ordinary APIs. |
| Owner        | Shop / Tenant     | Owns one or more shops and has full access to the shops they are authorized to manage.                          |
| Cashier      | Shop / Tenant     | Limited-access shop user focused on sales and invoice operations.                                               |
| Stock Keeper | Shop / Tenant     | Limited-access shop user focused on inventory management.                                                       |

---

## 3. Authorization Scope

The platform has two authorization scopes.

### 3.1 Platform Scope

Platform-level operations belong to the `Super Admin`.

These operations manage the SaaS platform itself rather than the financial
data of a particular shop.

Examples explicitly defined by the product requirements include:

- Viewing the list of registered shops
- Searching and filtering shops
- Activating or deactivating shops
- Managing shop subscription plans

### 3.2 Tenant / Shop Scope

Shop-level operations belong to users operating within a shop.

The shop-level roles currently defined are:

- Owner
- Cashier
- Stock Keeper

A shop-level user's access must always be constrained by the shop(s) that the
user is authorized to access.

---

## 4. Role Definitions

### 4.1 Super Admin

#### Responsibility

The Super Admin manages platform-level operational concerns.

#### Explicitly Supported Permissions

| Permission                                                        | Status                                       |
| ----------------------------------------------------------------- | -------------------------------------------- |
| View all registered shops                                         | Allowed                                      |
| Search/filter shops                                               | Allowed                                      |
| Activate a shop                                                   | Allowed                                      |
| Deactivate a shop                                                 | Allowed                                      |
| Manage shop subscription plans                                    | Allowed                                      |
| Direct access to shop financial data through ordinary tenant APIs | Denied                                       |
| Access shop data through separate audited support tooling         | Conditional / Architecture decision required |

#### Boundary

The Super Admin is a global platform actor.

A normal shop tenant context is not required for platform-level administration.

The current requirements explicitly state that Super Admin access to shop
financial data must not be available through normal APIs.

Any exceptional support access must use a separate mechanism with complete
audit logging.

---

### 4.2 Owner

#### Responsibility

The Owner is the primary business user for one or more shops.

The requirements explicitly state that an Owner may own multiple shops and may
switch between them.

#### Explicitly Supported Permissions

| Capability                            | Permission                                                    |
| ------------------------------------- | ------------------------------------------------------------- |
| Register account                      | Allowed                                                       |
| Configure shop information            | Allowed                                                       |
| Manage shop users                     | Allowed                                                       |
| Create limited-access users           | Allowed                                                       |
| Disable a shop user                   | Allowed                                                       |
| Define products/services              | Allowed                                                       |
| Define product categories             | Allowed / Should                                              |
| Configure low-stock thresholds        | Allowed / Should                                              |
| View customer account history         | Allowed                                                       |
| Define customers/suppliers            | Allowed                                                       |
| Record purchases                      | Allowed                                                       |
| Record cash in/out                    | Allowed                                                       |
| Configure multiple cash/bank accounts | Allowed / Should                                              |
| Manage checks                         | Allowed / Could                                               |
| View sales reports                    | Allowed                                                       |
| View profit/loss report               | Allowed                                                       |
| View inventory report                 | Allowed / Should                                              |
| View debtors/creditors report         | Allowed                                                       |
| View financial dashboard              | Allowed                                                       |
| Manage shop subscription plan         | Platform-level; not explicitly defined as an Owner permission |
| Switch between owned shops            | Allowed / Should                                              |

#### Boundary

The Owner has full access to the shop(s) the Owner is authorized to manage.

The source requirements explicitly state that an Owner may have more than one
shop and may switch between them.

The exact implementation model for multi-shop authorization is defined later
in the multi-tenancy architecture.

---

### 4.3 Cashier

#### Responsibility

The Cashier is a limited-access shop user focused on sales.

#### Explicitly Supported Permissions

| Capability                                | Permission             |
| ----------------------------------------- | ---------------------- |
| Login                                     | Allowed                |
| Search products by name/barcode           | Allowed                |
| Create sales invoice                      | Allowed                |
| Select payment type                       | Allowed                |
| Process sales return                      | Allowed / Should       |
| Print/send invoice                        | Allowed / Should       |
| Access profit/loss report                 | Denied                 |
| Access shop-wide financial administration | Not explicitly defined |
| Manage products                           | TBD                    |
| Manage inventory                          | TBD                    |
| Manage customers                          | TBD                    |
| Record purchases                          | TBD                    |
| Manage cash/bank accounts                 | TBD                    |

The requirements explicitly define that a Cashier can perform sales and that a
Cashier attempting to access the profit/loss report must receive `403
Forbidden`.

The remaining permissions require explicit product decisions before being
implemented as authorization rules.

---

### 4.4 Stock Keeper

#### Responsibility

The Stock Keeper is a limited-access shop user focused on inventory
management.

#### Explicitly Supported Permissions

The current User Story source identifies the Stock Keeper role and describes
it as an inventory-management role, but does not define its complete
permission matrix.

Therefore, the following capabilities are currently considered `TBD`:

| Capability                | Permission |
| ------------------------- | ---------- |
| Login                     | Allowed    |
| Manage products           | TBD        |
| Manage product categories | TBD        |
| View inventory            | TBD        |
| Update inventory          | TBD        |
| View low-stock alerts     | TBD        |
| Search products           | TBD        |
| Create sales invoice      | TBD        |
| Record purchase invoice   | TBD        |
| Access financial reports  | TBD        |
| Manage cash/bank accounts | TBD        |
| Manage users              | TBD        |

The Stock Keeper permissions above are the complete MVP policy.

---

## 5. Permission Matrix

The following matrix captures the current requirements without inventing
permissions that are not explicitly defined.

Legend:

- `✓` Explicitly allowed by current requirements
- `✗` Explicitly denied by current requirements
- `TBD` Not yet specified and requires a product decision
- `—` Not applicable / platform boundary

| Capability                       | Super Admin |                Owner |         Cashier |    Stock Keeper |
| -------------------------------- | ----------: | -------------------: | --------------: | --------------: |
| Platform shop management         |           ✓ |                    — |               — |               — |
| View shop list                   |           ✓ | Own shops only / TBD |               — |               — |
| Activate/deactivate shop         |           ✓ |                    — |               — |               — |
| Manage subscription plans        |           ✓ |                  TBD |               — |               — |
| Register user account            |           — |                    ✓ |               — |               — |
| Configure shop                   |           — |                    ✓ |               — |               — |
| Manage shop users                |           — |                    ✓ |               — |               — |
| Switch owned shops               |           — |                    ✓ |               — |               — |
| Product/service management       |           — |                    ✓ |             TBD |             TBD |
| Product search                   |           — |                  TBD |               ✓ |             TBD |
| Inventory management             |           — |                    ✓ |             TBD |             TBD |
| Sales invoice creation           |           — |                  TBD |               ✓ |             TBD |
| Sales returns                    |           — |                  TBD |      ✓ / Should |             TBD |
| Invoice printing/sending         |           — |           ✓ / Should |      ✓ / Should |               — |
| Purchase invoices                |           — |                    ✓ |             TBD |             TBD |
| Customer/supplier management     |           — |                    ✓ |             TBD |             TBD |
| Customer account history         |           — |                    ✓ |             TBD |             TBD |
| Cash in/out                      |           — |                    ✓ |             TBD |             TBD |
| Multiple cash/bank accounts      |           — |           ✓ / Should |             TBD |               — |
| Check management                 |           — |            ✓ / Could |             TBD |               — |
| Sales reports                    |           — |                    ✓ |             TBD |               — |
| Profit/loss report               |           — |                    ✓ |               ✗ |               ✗ |
| Inventory report                 |           — |           ✓ / Should |             TBD |             TBD |
| Debtors/creditors report         |           — |                    ✓ |             TBD |               — |
| Financial dashboard              |           — |                    ✓ |             TBD |               — |
| Direct shop financial API access |           ✗ |      Own tenant only | Own tenant only | Own tenant only |

---

## 6. Tenant Boundary Rules

Tenant authorization is a security boundary, not just a UI concern.

For every shop-level request:

1. The authenticated identity must be established.
2. The user's role must be evaluated.
3. The user's membership/ownership of the active shop must be verified.
4. The request must execute within that shop's tenant context.
5. Shop-owned data must not be returned from another shop.

A valid role by itself does not grant access to every shop.

For example, being a `Cashier` is not sufficient to access another shop's
invoice. The user must be authorized for the shop associated with that data.

---

## 7. Multi-Shop Owner

The product requirements explicitly support an Owner who owns multiple shops.

The expected user experience is:

1. The Owner authenticates.
2. The system presents the shops available to the Owner.
3. The Owner selects an active shop.
4. The dashboard and operational data are scoped to the selected shop.
5. Switching shops changes the active tenant context.
6. Data from the previously selected shop must not leak into the new context.

The exact representation of this context in JWT claims, sessions, or request
metadata is an architectural decision and is documented separately.

---

## 8. Authorization vs. Tenant Isolation

These are separate concerns.

### Authorization

Determines whether a role is permitted to perform an operation.

Example:

> A Cashier may create a sales invoice.

### Tenant Isolation

Determines whether the user is permitted to operate on a specific tenant's
data.

Example:

> A Cashier from Shop A must never read an invoice belonging to Shop B.

A request is considered authorized only when both conditions are satisfied:

```text
Role Permission
        +
Tenant Membership / Ownership
        +
Resource Tenant Ownership
        =
Authorized Request
```

---

## 9. Explicit Security Requirements

The current requirements define the following security expectations:

### 9.1 Cross-Tenant Access

If a user from Shop A attempts to access a resource belonging to Shop B,
the server must prevent data disclosure and return an appropriate denial
response such as `403` or `404`.

### 9.2 Query Isolation

Tenant-level queries must be automatically constrained by tenant context.

A query that can accidentally operate across tenants is considered a security
defect.

### 9.3 Super Admin Boundary

Super Admin must not use ordinary shop APIs to access shop financial data.

Exceptional support access, if introduced, must be separate and fully audited.

---

## 10. Final MVP Authorization Decisions

The following decisions are approved for the MVP:

1. A User may own multiple Tenants. Each Tenant has exactly one Owner.
2. Employees are created and managed by their Tenant's Owner.
3. `Owner` has full access to the Tenant.
4. `Accountant` has full operational and financial/accounting access, but
   cannot delete financial documents or change ownership.
5. `Cashier` can search products, create sales, register customers, and accept
   cash, card, credit, or mixed payments. Cashier cannot manage inventory,
   purchases, expenses, financial reports, users, or accounts.
6. `Stock Keeper` can view products and stock, register stock receipts,
   adjustments, waste/damage, stock counts, and movement history. Every manual
   adjustment requires a reason. Stock Keeper cannot create financial invoices
   or payments.
7. `Super Admin` is platform-scoped and must not access Tenant financial data
   through ordinary APIs.
8. Permissions are enforced by the backend using both role and Tenant
   membership. UI hiding is not an authorization mechanism.
9. Financial documents are immutable after confirmation. Correction, return,
   or reversal creates a new linked document.

These decisions are the baseline for authorization guards and API design.
