# Application Architecture

## 1. Purpose

This document defines how the application is organized internally as a modular monolith.

## 2. Architectural Direction

The initial application is a modular monolith:

```text
API / Presentation
        ↓
Application / Use Cases
        ↓
Domain
        ↓
Infrastructure
```

The application starts as one deployable unit while preserving explicit module boundaries.

## 3. Module Structure

Initial logical modules:

```text
identity
shops / tenants
catalog
inventory
sales
purchases
contacts
cash-management
accounting
reporting
subscriptions
```

A module owns its business rules and application use cases. Other modules should interact through explicit application/domain boundaries rather than directly mutating internal state.

## 4. Layer Responsibilities

### Presentation

Responsible for HTTP transport, request validation, authentication entry points, and response mapping. It must not contain core business rules.

### Application

Responsible for orchestrating use cases, transaction boundaries, authorization checks, and coordination between domain components and infrastructure.

### Domain

Responsible for business invariants, domain concepts, state transitions, and rules that must remain true regardless of transport or persistence technology.

### Infrastructure

Responsible for database access, external providers, queues, file storage, caching, and other technical integrations.

## 5. Dependency Direction

Dependencies should point inward:

```text
Presentation  → Application → Domain
Infrastructure → Application / Domain contracts
```

Domain code should not depend on HTTP, ORM models, controllers, or vendor-specific providers.

## 6. Cross-Module Communication

Preferred order:

1. Direct application use case call when the dependency is synchronous and stable.
2. Domain/application event when loose coupling is valuable.
3. Background job when work does not need to complete within the request.

Direct access to another module's persistence tables should be avoided.

## 7. Example: Completing a Sale

```text
Sales Use Case
   ↓
Validate invoice
   ↓
Reserve/update Inventory
   ↓
Apply Customer / Payment effect
   ↓
Persist atomic business result
   ↓
Emit relevant events
```

The exact workflow will be defined in the sales and workflow documentation.

## 8. Repository Boundary

Repositories should expose business-oriented persistence operations rather than leaking ORM details into the domain.

Tenant-scoped repositories must require or inherit a validated tenant context.

## 9. Domain Services

A domain service should only be introduced when a business rule genuinely spans multiple domain objects and does not naturally belong to one entity/value object.

Services must not become generic utility containers.

## 10. Transaction Boundary

Application use cases define the business transaction boundary for operations that change multiple related records.

Financially or operationally significant state changes should be atomic according to their business rules.

## 11. Events

Events are intended to communicate meaningful state changes, such as:

- InvoiceConfirmed
- PurchaseConfirmed
- PaymentRecorded
- InventoryLow
- ShopDeactivated

Event names and payloads will be defined later.

Events must preserve tenant context when they concern tenant-owned data.

## 12. Background Jobs

Background jobs may be used for non-blocking work such as notifications, scheduled checks, document generation, and subscription processing.

Every tenant-scoped job must carry explicit tenant context.

## 13. Caching

Caching is optional infrastructure and must not become a source of truth for financial or inventory state.

Tenant identity must be included in isolation rules for tenant-owned cached data.

## 14. Testing Boundaries

Each module should be independently testable at:

- Domain/business-rule level
- Application/use-case level
- Integration level
- End-to-end level where needed

Tenant isolation and financial invariants require dedicated automated coverage.

## 15. Initial Code Organization

The exact framework syntax is intentionally left open, but the conceptual structure should resemble:

```text
src/
├── modules/
│   ├── identity/
│   ├── tenants/
│   ├── catalog/
│   ├── inventory/
│   ├── sales/
│   ├── purchases/
│   ├── contacts/
│   ├── cash-management/
│   ├── accounting/
│   ├── reporting/
│   └── subscriptions/
│
├── shared/
└── infrastructure/
```

Shared code should contain only genuinely cross-cutting primitives and must not become a hidden dependency between business modules.

## 16. Evolutionary Architecture Decision

The MVP is a NestJS modular monolith. Module boundaries, ports, adapters,
events, and background jobs must support future extraction of selected workers
or services, including Go implementations. Microservice deployment is deferred
until measured operational need justifies it. The detailed policy is documented
in `evolutionary-architecture.md`.

## 17. Open Decisions

- Exact NestJS module/folder conventions
- ORM and repository implementation are resolved as Prisma with PostgreSQL.
- Transaction management is resolved as PostgreSQL application transactions.
- Queue implementation is resolved as BullMQ with Redis.
- Transactional outbox is required from the beginning.
- Remaining open items are exact module naming conventions, event bus wiring,
  and future cache policy.
