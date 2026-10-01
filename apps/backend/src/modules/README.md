# Backend Modules

One directory per domain module, organized by layer and then by feature
(ADR-002, `docs/product/v1/11-engineering/03-project-structure.md`).

```text
<module>/
├── domain/           Business rules: entities, value objects, aggregates,
│                     domain services/policies, domain events, invariants,
│                     repository interfaces (ports). No framework or I/O imports.
├── application/
│   ├── commands/     One command + handler per use case.
│   ├── queries/      One query + handler per use case.
│   └── event-handlers/
├── infrastructure/   Persistence, messaging, external adapters, mapping.
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
   `infrastructure/persistence/` (ADR-002, section 8).
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

## Module boundary enforcement

Boundary violations are currently controlled by review. `tooling/` is the place for
the automated dependency check (for example a dependency-cruiser or
`import/no-restricted-paths` rule) that the architecture acceptance criteria require
before the first module lands.
