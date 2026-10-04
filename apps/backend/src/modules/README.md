# Backend Modules

One directory per domain module, organized by layer and then by feature
(ADR-002, `docs/product/v1/11-engineering/03-project-structure.md`).

```text
<module>/
├── domain/           Business rules: entities, value objects, aggregates,
│                     domain services/policies, domain events, invariants,
│                     repository interfaces (ports, composed from
│                     src/shared/persistence/). No framework or I/O imports.
├── application/
│   ├── commands/     One command + handler per use case.
│   ├── queries/      One query + handler per use case.
│   └── event-handlers/
├── infrastructure/   Persistence adapter (implements the ports), messaging,
│                     external adapters, mapping.
└── presentation/     REST controllers, request/response DTOs, input validation.
```

Directories are created together with the module's first real use case; the empty
layer directories here only mark the approved shape.

## Open decision — the list below

`src/modules/README.md` currently lists the modules from the project-structure
document. Verify the list against the domain map
(`docs/product/v1/09-domain/00-domain-map-and-principles.md`) when the first module
is implemented, and update the structure document in the same change if they diverge.

## Rules that apply to every module

1. A module owns its data. No other module may read or write its internal entity,
   repository, table or ORM model (ADR-001, section 5; ADR-002, section 12).
2. Cross-module communication happens only through published contracts: command,
   query, application/domain service contract or domain event. The base contracts a
   module publishes from are `src/shared/messaging/`'s `Command`, `Query` and
   `DomainEvent` (SHR-003) — a module imports those bases plus the _published_
   contract types of another module, never its entities, repositories or tables.
   Contract: `docs/product/v1/11-engineering/17-command-query-event-contracts.md`.
3. Domain code must not import NestJS, Drizzle, mysql2, Redis, HTTP, a queue library
   or any provider SDK.
4. Domain entity and persistence model are separate types, always (ADR-002, section 9).
5. Repository interfaces live in `domain/`; implementations live in
   `infrastructure/persistence/` (ADR-002, section 8). A repository is declared
   from the shared capabilities in `src/shared/persistence/` — `LoadsById`,
   `AddsAggregate`, `UpdatesAggregate`, `ChecksExistence`, `FindsByCriteria` —
   plus the module's own methods over closed criteria types. It exposes no
   `delete`, no upsert and no generic query: writes state the expected
   `Revision`, technical failures are a thrown `PersistenceError`, and absence
   is `undefined`, which the use case turns into whatever the business decided.
   Contract: `docs/product/v1/11-engineering/18-repository-and-persistence-ports.md`.
6. No cross-module foreign keys, and no circular module dependencies.
7. Controllers validate input and delegate; they never hold business rules
   (ADR-002, section 16).
8. Technical configuration is read in Infrastructure only (ADR-002, section 21).
9. **Expected failures are returned, unexpected ones are thrown.** A use case
   returns `Result<T, DomainError>` when not doing the work is a normal outcome the
   business decided about (record missing, period closed, rule declined); it throws
   — and does not catch — when something the business did not decide about breaks.
   Domain errors come from `src/shared/errors/` (`ValidationError`,
   `BusinessRuleError`, `ConflictError`, `NotFoundError`, `StateViolationError`, or
   a module-owned subclass of `DomainError` with its own stable code). Domain code
   never knows how those become a response, a log line or an alert. Contract:
   `docs/product/v1/11-engineering/16-result-and-error-model.md`.
10. **Read ports are separate and read-only.** A `ReadPort` from
    `src/shared/persistence/` takes module-owned criteria — carrying the tenant
    scope the application resolved from the authenticated principal — and returns
    plain, serializable read models: never an aggregate, never a write, never a
    path around the owning Domain (ADR-003, sections 6, 14 and 24).
11. **Transactions are opened by the application, never by a repository.** A use
    case wraps the operations that must commit together in exactly one
    `TransactionBoundary.execute(...)` (token `TRANSACTION_BOUNDARY`); a nested
    call joins the open boundary instead of opening a second one, and any
    failure inside — thrown or reported as a failed `Result` — rolls the whole
    boundary back (a swallowed failure becomes `TransactionBoundaryError`).
    Repository adapters join that boundary through `scopedDatabase(...)`,
    which falls back to a plain connection outside one; they never start a
    transaction of their own, and Domain code never sees the contract at all.
    A rollback undoes database work only: an external call made inside the
    boundary keeps its effect and needs retry / compensation outside it.
    Conflict inside a boundary (`PersistenceError(CONFLICT)` → `ConflictError`)
    rolls the boundary back instead of overwriting the winner. Contract:
    `docs/product/v1/11-engineering/19-transaction-boundary.md`.
12. **Domain events are recorded in the same transaction, through the outbox.**
    After a valid state change, the use case calls
    `this.outbox.record(new SomethingHappened(...))` (token `OUTBOX_RECORDER`)
    inside the same `TransactionBoundary.execute`, so the event and the change
    commit or roll back together — recording outside a boundary throws
    (`OutboxTransactionRequiredError`), and publishing to Redis directly from
    a use case is the dual write the outbox exists to prevent. The event's
    identity (`metadata.messageId`) is fixed at record time and every attempt
    republishes the same bytes; consumers deduplicate on that id. Contract:
    `docs/product/v1/11-engineering/20-transactional-outbox.md`.
13. **Tenant context comes from the shared abstraction, never from a client.**
    A use case reads the current tenant scope through `TenantScope.require()`
    (token-free, ambient) and stamps raised messages with
    `tenantScopedMessageOptions(...)`; infrastructure entry points establish it
    — the Worker from `envelope.tenantId`, later the auth guard from the
    principal — and nothing reads a header, body or query as tenant identity.
    A tenant-scoped operation without a scope fails closed
    (`TenantContextMissingError`), and `domain/` does not import
    `src/shared/tenant/` at all: Domain receives the scope as an explicit
    operation input. No module defines its own context type or resolves
    identity from transport-specific authentication data. Contract:
    `docs/product/v1/11-engineering/21-tenant-context.md`.
14. **A protected write names the revision it expects, and a lost race is a
    conflict — never an overwrite, never a hidden retry.** The mechanism is
    shared (`src/shared/persistence/`'s SHR-008 pair): an adapter that no longer
    holds the revision it was given refuses the write in the same statement and
    reports it with `staleRevisionConflict(operation, expectedRevision,
actual?)`; the use case reads it back with `isConcurrencyConflict`,
    `staleRevisionOf` or `toConflict` and decides what happens next — reload,
    recompute, ask for review, or hand the conflict to the caller. Domain never
    constructs that failure and never replays a mutation, no repository
    exposes a locking call, and nothing writes a protected record without its
    expected `Revision` (`update(aggregate, expectedRevision)` has no path that
    omits it). Which records are protected, and what a conflict means to the
    business, is this module's policy. Contract:
    `docs/product/v1/11-engineering/22-optimistic-concurrency.md`.

## Module boundary enforcement

Two structural guards run with the test suite:

- `src/modules/module-boundaries.spec.ts` — Domain imports only its own module,
  `src/shared/`, `node:*` and the test runner (never `src/shared/transaction/`,
  so Domain cannot open, observe or control a transaction, and never
  `src/shared/tenant/`, so Domain cannot read ambient tenant state); no module
  imports another module's `infrastructure/`, `persistence/` or
  `repositor(y|ies)` (published contracts under `application/` and domain events
  stay importable).
- `src/shared/persistence/persistence-conventions.spec.ts` — the persistence
  ports offer only the operation vocabulary, with no delete, no generic
  repository and no implementation token.

Review still covers what a static check cannot (a query that reaches the wrong
table through a shared connection, a contract that leaks internals). `tooling/`
remains the place for the broader automated dependency check (for example a
dependency-cruiser or `import/no-restricted-paths` rule) that the architecture
acceptance criteria require before the first module lands.
