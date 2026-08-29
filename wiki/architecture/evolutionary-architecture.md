# Evolutionary Architecture

## 1. Decision

The MVP is implemented as a **Modular Monolith with NestJS**. It is one
deployable application and may use one database, while preserving explicit
module boundaries for future extraction.

Microservices are not part of the initial deployment plan. A module becomes an
independent service only when measured scale, reliability, workload isolation,
or team ownership justifies the operational cost.

## 2. Module Boundaries

Each business module uses this structure:

```text
module/
├── domain/
├── application/
├── infrastructure/
└── presentation/
```

Modules must not import another module's ORM entities or repositories. They
communicate through application use cases, explicit ports, or domain/application
events.

## 3. Ports and Adapters

Business code depends on internal interfaces. NestJS implementations are the
first adapters. A future Go service may implement the same capability through
an HTTP, gRPC, or message adapter without changing the domain contract.

```text
Use Case → Port / Contract → NestJS Adapter today
                         → Go Adapter later
```

The contract must define input, output, errors, idempotency, timeout, and
versioning behavior.

## 4. Synchronous and Asynchronous Work

Use synchronous application calls for short operations requiring an immediate
result, such as confirming a sale and updating stock.

Use jobs/events for non-blocking work, such as reports, notifications, file
processing, and rebuilding projections. A job always carries `tenant_id`, a
unique job ID, correlation ID, retry count, and schema version.

## 5. Outbox and Queue

When a business transaction produces an event, the event is written to an
outbox in the same database transaction as the business change. A worker later
publishes the event to a queue. Publishing and processing must be idempotent.

```text
NestJS Use Case
    ↓
Business transaction + Outbox row
    ↓
Outbox publisher
    ↓
Queue
    ↓
NestJS worker today / Go worker later
```

Failed messages use bounded retries and a dead-letter queue. The business
transaction must not depend on successful notification or reporting work.

## 6. Future Go Services

The first likely extraction candidates are reporting/analytics, inventory
valuation, large import/export, document processing, and other CPU-intensive
workers. Identity, Tenant authorization, sales confirmation, payments, and
core financial invariants remain in NestJS until a strong reason exists to
separate them.

An extracted service must own its API contract and, where appropriate, its
read model or database. It must not directly mutate another module's tables.

## 7. Data Ownership During Transition

The MVP may use a shared database, but table ownership is logical and explicit.
Cross-module reads use stable query contracts or projections. Cross-module
writes use commands/events. This preserves a path to database separation later.

## 8. Extraction Checklist

Before extracting a module, confirm:

1. Its business boundary and data ownership are explicit.
2. Its input/output contract is versioned.
3. Its events and idempotency behavior are defined.
4. Its latency, throughput, and failure profile justify separation.
5. It has independent logging, metrics, deployment, and ownership.
6. Tenant authorization remains enforced at the new service boundary.
7. A rollback and data migration plan exists.

## 9. Non-Goals

The MVP will not introduce service discovery, distributed transactions,
multiple deployable business services, or cross-service synchronous chains
without a demonstrated requirement.
