# Architecture Overview

## 1. Purpose

This document defines the high-level architectural direction of the Accounting SaaS platform.

It establishes the major architectural boundaries and principles without prescribing implementation details for individual entities, APIs, or database tables.

Detailed architecture documents extend this document.

## 2. Architecture Goals

- Multi-tenant operation with strict tenant isolation
- Simple business-facing user experience
- Support for individuals, small businesses, and small companies
- Clear separation between business operations and accounting capabilities
- Future introduction of double-entry accounting without rewriting core business modules
- Clear role-based authorization
- Reliable financial and inventory state transitions
- Auditable business operations
- Ability to evolve the SaaS platform with subscription capabilities

## 3. Architectural Style

The system follows a modular application architecture with explicit business-domain boundaries.

The conceptual layering is:

```text
Presentation / API
        ↓
Application / Use Cases
        ↓
Domain
        ↓
Infrastructure
```

Core business logic should not live primarily in controllers, HTTP handlers, or database models.

## 4. High-Level Layers

### 4.1 Presentation Layer

Responsible for client interaction, request validation at the transport boundary, authentication endpoints, and API responses.

It should translate incoming requests into application commands/use cases and translate application results into transport responses.

### 4.2 Application Layer

Responsible for orchestrating use cases such as:

- Register Owner
- Create Shop
- Create Product
- Create Sales Invoice
- Record Purchase
- Record Payment
- Process Return
- Switch Active Shop

Application services coordinate domain operations and infrastructure dependencies. Core business rules should remain in the domain where appropriate.

### 4.3 Domain Layer

Responsible for business concepts and business rules.

Expected concepts include:

- Shop / Tenant
- User
- Role
- Product
- Customer
- Supplier
- Invoice
- Invoice Item
- Payment
- Inventory
- Expense
- Cash / Bank Account

The complete domain model is documented separately.

### 4.4 Infrastructure Layer

Responsible for external technical concerns such as:

- Database
- Cache
- Message broker
- File storage
- SMS provider
- Email provider
- Payment provider
- Background jobs

Infrastructure implementations should be replaceable without changing business semantics.

## 5. Major Business Modules

The initial logical module boundaries are:

```text
Identity
Tenants / Shops
Catalog
Inventory
Sales
Purchases
Contacts
Cash & Banking
Accounting
Reporting
Subscriptions
```

These are logical boundaries, not necessarily separate deployable services.

## 6. Initial Deployment Strategy

The preferred initial direction is a modular monolith.

```text
Client Applications
        ↓
Application API
        ↓
Modular Business Application
        ↓
Shared Database
```

The initial product should use one deployable application while preserving internal module boundaries.

Microservices should not be introduced merely because modules exist. Extraction of a module should be driven by scale, isolation, or organizational needs.

## 7. Core Architectural Boundaries

### 7.1 Identity Boundary

Responsible for identity, authentication, credentials, sessions/tokens, and role assignment.

### 7.2 Tenant Boundary

Responsible for shop identity, shop status, user-to-shop relationships, active tenant context, and tenant-level authorization boundaries.

### 7.3 Operational Domain

Responsible for day-to-day business operations including sales, purchases, inventory, customers, suppliers, cash, and banking.

### 7.4 Accounting Boundary

Responsible for accounting-specific concepts.

The MVP may expose simplified financial behavior, but the architecture must preserve a separate accounting boundary for future double-entry bookkeeping.

Potential future concepts include Chart of Accounts, Journal Entries, Debit/Credit, General Ledger, Fiscal Period, and Accounting Adjustments.

Core business modules should not depend on an accounting UI or accounting-specific presentation model.

### 7.5 Reporting Boundary

Responsible for producing user-facing analytical and financial reports from business and financial information.

Reporting should not redefine source-of-truth business rules.

## 8. Accounting Architecture Principle

The accounting-ready design follows:

```text
Business Operation
        ↓
Business State Change
        ↓
Financial / Inventory Effect
        ↓
Future Accounting Posting
```

The MVP does not require exposing full double-entry bookkeeping to every user.

Business operations must nevertheless be modeled so their financial effects can later be represented by accounting postings.

Example:

```text
Sale
 ├── Invoice
 ├── Inventory effect
 ├── Payment / receivable effect
 └── Future accounting posting
```

## 9. Cross-Cutting Concerns

The following concerns apply across multiple modules:

- Authentication
- Authorization
- Tenant isolation
- Validation
- Transactions
- Audit logging
- Error handling
- Observability
- Idempotency where required
- Background jobs
- Notifications

These concerns should have centralized and consistent policies where practical.

## 10. Data Ownership Principle

Each module should have clear ownership of the data and state it controls.

Examples:

- Inventory owns inventory state and inventory movements.
- Sales owns sales invoices and the sales workflow.
- Contacts owns customer and supplier records.
- Accounting owns accounting-specific records when the capability is introduced.
- Reporting consumes data and should not become the owner of operational transactions.

The exact entity ownership model will be defined in the Domain and Data documentation.

## 11. Transactional Consistency

Business operations that change multiple related states must define explicit transactional boundaries.

For example, completing a sale may affect:

- Invoice
- Invoice items
- Inventory
- Customer balance
- Payment/cash state
- Audit information

Completing a purchase may affect:

- Purchase invoice
- Purchase items
- Inventory
- Supplier balance
- Payment/cash state
- Audit information

The exact consistency model and transaction boundaries will be defined in workflow documentation.

## 12. Security Principle

Security must be enforced on the backend. Frontend visibility is never an authorization mechanism.

A tenant-scoped request should conceptually satisfy:

```text
Identity
   +
Role / Permission
   +
Tenant Membership / Ownership
   +
Resource Tenant Ownership
   =
Authorized Request
```

Detailed tenant-security rules belong in `multi-tenancy.md` and `security.md`.

## 13. Extensibility Principles

The architecture should permit future capabilities without rewriting the core business model, including:

- Double-entry accounting
- Paid subscription plans
- Advanced reporting
- Additional payment providers
- Additional notification channels
- More sophisticated inventory capabilities
- Additional roles and permissions

Extensibility should come from explicit boundaries rather than premature abstraction.

## 14. Current Architectural Decisions

| Decision                | Direction                                          |
| ----------------------- | -------------------------------------------------- |
| Application style       | Modular application                                |
| Initial deployment      | Single deployable application                      |
| Initial architecture    | Modular monolith                                   |
| Multi-tenancy           | Shared infrastructure with strict tenant isolation |
| Product model           | Industry-agnostic                                  |
| MVP accounting UX       | Simplified business-facing experience              |
| Accounting architecture | Accounting-ready boundary                          |
| Future bookkeeping      | Double-entry capable                               |
| Authorization           | Role + tenant/resource scope                       |
| Reporting               | Separate read/reporting concern                    |

## 15. Architectural Unknowns

MVP decisions are resolved in `technical-decisions-mvp.md` and the accepted
ADRs: NestJS Modular Monolith, PostgreSQL, Prisma, JWT with rotated refresh
tokens, transactional outbox, BullMQ/Redis, and UUID v4. Remaining items are:

- Exact framework/module structure
- Future database topology
- Exact tenant-context propagation mechanism
- Future authentication/session extensions
- Exact authorization implementation
- Exact accounting posting model
- Future event schema evolution
- Exact caching strategy
- Future worker extraction
- Exact observability stack

These should be resolved in dedicated architecture documents or ADRs rather than embedded prematurely in this overview.
