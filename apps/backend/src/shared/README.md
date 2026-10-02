# Shared (Shared Kernel)

Code that is genuinely domain-agnostic and reused across modules.

Allowed here (ADR-002, section 10):

- `Money`, `Currency`, identifier primitives, business-date primitives,
  `Result`/`error` primitives, company (tenant) context primitives, the base
  command / query / domain-event contracts, the persistence port conventions
  (repository capabilities, revision, read port, persistence failure, the shared
  stale-revision conflict) and the application-owned transaction boundary
  contract.

That list is now implemented: `primitives/` + `id/` + `money/` + `quantity/` +
`time/` are SHR-001, `errors/` (the `Result` and `DomainError` model) is
SHR-002, `messaging/` (the Command, Query and Domain Event contracts) is
SHR-003, `persistence/` (the repository, read-port and persistence-failure
contracts, plus the shared optimistic-concurrency mechanism) is SHR-004 and
SHR-008, `transaction/` (the transaction-boundary contract) is
SHR-005, and `tenant/` (the tenant-context contract) is SHR-007.

Not allowed here:

- `Customer`, `Supplier`, `Product`, `Invoice`, `AccountingDocument`, `AgentPlan`,
  `Employee`, `TaxInvoice` — anything with business meaning belongs to its owning
  module even when several modules need it.
- Generic helpers (`utils`, `common`, `helpers`) that exist only to avoid a decision
  about ownership.

Every addition must be reviewed against the question: _is this truly independent of
our business domains, or does it merely look shared?_

## Rules

1. **No framework or infrastructure import.** A file here imports only `node:*`
   builtins and other files in this folder. No NestJS, Next.js, HTTP, ORM,
   Redis, MySQL or provider SDK. This is enforced mechanically by
   `framework-independence.spec.ts`, which fails the test run on a violation.
2. **No business rule.** These types describe form, never policy: `Quantity`
   refuses to mix `kg` with `g` but has no conversion table, and `BusinessDate`
   is a calendar day with no notion of a fiscal period. Which rule applies to a
   value is always the owning module's decision.
3. **Invalid states are rejected, never repaired.** Every constructor validates
   its input and throws `InvalidPrimitiveError` naming the primitive and the
   field, so a bad value fails loudly and identically everywhere.
4. **`DomainError` is for business failures only.** A rejected primitive is a
   programming error, not a client-facing one — that stays
   `InvalidPrimitiveError`. Throwing a `DomainError` means an _expected_ failure;
   anything unexpected keeps being a plain exception.
5. **Expected failures are returned, unexpected ones are thrown.** Use cases return
   `Result<T, DomainError>` for outcomes the business decided about, and let
   technical faults propagate. See `docs/product/v1/11-engineering/16-result-and-error-model.md`.
6. **Message contracts state form, never delivery.** `messaging/` says what an
   intent, a read and a fact look like — envelope, naming, metadata, immutability.
   How a message is routed, persisted or delivered (bus, outbox, Redis) is
   Infrastructure, and which commands and events exist is the owning module's
   published contract. See
   `docs/product/v1/11-engineering/17-command-query-event-contracts.md`.
7. **Persistence ports state access, never storage.** `persistence/` says what a
   module may ask of its own data — load, add, update against an expected
   revision, find by a closed criterion, read a plain model — and how an adapter
   reports a technical failure. It ships no repository, no criteria builder, no
   delete and no implementation type; where the repository lives, which criteria
   exist and whether a record may ever be removed are the owning module's
   decisions. See
   `docs/product/v1/11-engineering/18-repository-and-persistence-ports.md`.
8. **The transaction boundary is Application-owned.** `transaction/` defines how
   a use case makes several persistence operations commit or roll back as one
   unit: one `TransactionBoundary.execute(...)` per boundary, nested calls join
   the open boundary instead of opening a new one, and any failure inside —
   thrown or reported as a failed `Result` — makes the whole boundary roll back.
   Domain code may not open, observe or control a transaction (enforced by
   `src/modules/module-boundaries.spec.ts`); repositories join the open
   boundary through `scopedDatabase(...)` and never start one. A rollback covers
   database effects only — an external call inside the boundary is not undone.
   Contract: `docs/product/v1/11-engineering/19-transaction-boundary.md`.
9. **The tenant context is established only from a trusted boundary.**
   `tenant/` defines the company boundary an operation runs under: three states
   (`available`, `system`, `missing`), ambient propagation on
   `node:async_hooks` through `TenantScope`, and the message-stamping helper
   `tenantScopedMessageOptions(...)`. Fail closed — a tenant-scoped operation
   without an available scope throws `TenantContextMissingError`; no client
   input (header, body, query) is ever read as tenant identity; no business
   data (names, memberships, permissions) enters the context. Domain may not
   read the ambient scope at all (enforced by
   `src/modules/module-boundaries.spec.ts`); it receives the scope as an
   explicit operation input from Application.
   Contract: `docs/product/v1/11-engineering/21-tenant-context.md`.
10. **Optimistic concurrency is the only concurrency mechanism here.**
    `persistence/` supplies the shared shape of a lost race: a `Revision` read
    with the record, an `expectedRevision` that is required on every write, a
    stale update refused through `staleRevisionConflict(...)` with its
    `{ expected, actual }` cause behind it, and the guards the application uses
    to recognise one (`isConcurrencyConflict`, `staleRevisionOf`, `toConflict`).
    There is no write that does not name the revision it expects, no silent
    last-write-wins, no automatic retry of a failed business mutation — reload,
    rebuild, re-ask or return the conflict are decisions for the application or
    the owning Domain — and no locking API of any store, pessimistic or
    database-specific, anywhere a Domain or Application can see. Which records
    are protected, and what a conflict means to the business, stays the owning
    module's policy.
    Contract: `docs/product/v1/11-engineering/22-optimistic-concurrency.md`.

## Layout

```text
shared/
├── errors/
│   ├── domain-error.ts        business failure the API maps (FND-006)
│   ├── error-category.ts      VALIDATION | BUSINESS_RULE | CONFLICT | NOT_FOUND | STATE_VIOLATION
│   ├── error-detail.ts        structured, serializable reasons
│   ├── category-errors.ts     the five ready-made category failures
│   └── result.ts              generic Result<T, E>
├── messaging/
│   ├── message-kind.ts        command | query | event
│   ├── message-name.ts        imperative / read / past-tense naming rules
│   ├── message-metadata.ts    id, type, timestamp, tenant, correlation, causation, version
│   ├── message.ts             abstract Message + causedBy(...)
│   ├── command.ts             intent contract, body under `payload`
│   ├── query.ts               read contract, body under `params`
│   └── domain-event.ts        fact contract, body under `data`
├── persistence/
│   ├── persistence-error.ts   the five storage-failure kinds + translation boundary
│   ├── revision.ts            optimistic-concurrency token of a stored record
│   ├── repository-ports.ts    load / add / update / exists / find capabilities
│   ├── stale-revision.ts      the stale-update cause as plain data + its detail
│   ├── optimistic-concurrency.ts  the shared conflict: build it, detect it, translate it
│   └── read-port.ts           read-only port returning plain read models
├── transaction/
│   ├── transaction-context.ts    the ambient scope that propagates an open boundary
│   ├── transaction-boundary.ts   the port, the runner delegate, the factory, the error
│   ├── transaction-boundary.spec.ts   commit / rollback / nesting contract tests
│   └── transaction-context.spec.ts    propagation contract tests
├── tenant/
│   ├── tenant-context.ts         the context value: available / system / missing + factory
│   ├── tenant-scope.ts           the ambient scope: current / require / run / runAsSystem
│   ├── tenant.errors.ts          TenantContextMissingError (fail-closed refusal)
│   ├── tenant-message-options.ts stamps the scope onto a message being raised
│   └── *.spec.ts                 creation / propagation / isolation / stamping tests
├── id/entity-id.ts            the one identifier every module uses
├── money/currency.ts          ISO 4217 code + minor unit, registry-extended
├── money/money.ts             exact amount + currency value object
├── quantity/quantity.ts       counted amount + opaque unit code
├── time/business-date.ts      a calendar day: business/accounting dates
├── time/date-time.ts          a UTC instant: created-at/posted-at
└── primitives/                exact decimal, rounding, calendar, validation
```

`framework-independence.spec.ts` sits at the root of the folder and checks the
whole tree.

## Status

- `errors/domain-error.ts` — the base class for a business failure: an error
  primitive (ADR-002, section 10) that the domain/application layers throw
  without importing HTTP or NestJS, and that the API layer maps to the standard
  error contract (FND-006). Carries a stable upper-snake `code`, a shared
  `category`, structured `details` and a `toJSON()` snapshot; `cause` stays
  internal by design. Frozen on construction.
- `errors/result.ts` — `Result<T, E>`: `ok`/`fail`, safe `value()`/`error()`,
  `match`, `map`, `mapError`, `andThen`, `orElse`, `getOrElse`, and `Result.all`
  for composing many outcomes into one that reports every failure.
- `errors/category-errors.ts` — `ValidationError`, `BusinessRuleError`,
  `ConflictError`, `NotFoundError`, `StateViolationError`, plus
  `ValidationError.fromDetails(...)` for a multi-field rejection.
- `messaging/` — the SHR-003 contracts: `Command<TPayload>`, `Query<TParams>` and
  `DomainEvent<TData>` share one envelope (`kind` + `name` + `metadata` + body),
  validate the imperative / read / past-tense reading of their name at
  construction, carry the seven generic metadata fields (message id, type,
  timestamp, version, tenant, correlation, causation) and freeze themselves and
  their body. `causedBy(source)` derives an effect's metadata from its cause.
- `persistence/` — the SHR-004 ports: repository capabilities (`get`, `add`,
  `update` against a required expected revision, `exists`, `find` by a closed
  criterion), the `Revision` token that makes a stale write a conflict instead
  of an overwrite, a read-only `ReadPort` that returns plain read models, and
  `PersistenceError`, the five-kind failure vocabulary an adapter translates
  driver problems into (with retry/known-outcome policy per ADR-004, section
  12). No repository, no criteria builder, no delete, no implementation type.
- `persistence/stale-revision.ts` + `persistence/optimistic-concurrency.ts` — the
  SHR-008 mechanism built on those ports: `staleRevisionConflict(operation,
expected, actual?)` is the one way an adapter reports a lost race (a
  `PersistenceError(CONFLICT)` whose cause is the plain-data
  `StaleRevision { expected, actual }`), and `staleRevisionOf`,
  `isConcurrencyConflict` and `toConflict` are how the application reads one
  back and turns it into the shared `ConflictError` — carrying the revision it
  worked against as an `ErrorDetail`. Nothing here retries a failed mutation,
  and nothing here knows what a record means.
- `transaction/` — the SHR-005 contract: `TransactionBoundary.execute(work)` is
  the single way a use case opens a transaction (commit when the work resolves
  with no failure reported, rollback when it throws or a failed `Result`
  surfaces, `TransactionBoundaryError` when a failure inside was swallowed);
  nested calls join the open boundary instead of opening a new one;
  `TransactionContext` propagates the open boundary through the async chain on
  `node:async_hooks` only; `scopedDatabase(db)` lets a repository join it — or
  run standalone outside one. The port knows nothing of Drizzle, MySQL or
  NestJS; the mechanics live in `src/infrastructure/database/`. External
  effects inside the boundary are explicitly not rolled back.
- `tenant/` — the SHR-007 contract: `TenantContext` is the company boundary of
  one operation in three states (`available` with `tenantId` + optional
  `correlationId`, explicit `system`, `missing`); `TenantScope` publishes it
  down the async chain (`current()` / `require()` / `run(...)` /
  `runAsSystem(...)`), refuses a tenant-scoped operation without a scope via
  `TenantContextMissingError`, and never reads a client input;
  `tenantScopedMessageOptions(...)` stamps the scope onto a Command, Query or
  Domain Event with explicit values always winning. Domain never touches the
  ambient scope (enforced by `src/modules/module-boundaries.spec.ts`). The
  mechanics live at the trusted entry points: the Worker (from the job
  envelope) and, later, the authenticated request path.
- `primitives/` — exact decimal arithmetic on `bigint` (no floating point), the
  six `RoundingMode`s, UTC calendar helpers and the validation rules every
  primitive applies to raw input.
- `id/entity-id.ts` — UUID-based `EntityId`, value-equal and serializing as a
  bare string.
- `money/` — `Currency` (IRR active, registry for future codes) and `Money`
  (amount stored as integer minor units; currency mismatch, excess precision and
  malformed amounts all rejected).
- `quantity/` — `Quantity`: exact decimal amount plus an opaque unit code, with
  no conversion or equivalence rules.
- `time/` — `BusinessDate` (`YYYY-MM-DD`, timezone-free) and `DateTime` (UTC
  instant). Together they keep the four domain roles — Business Date, Accounting
  Date, Created At, Posted At — from collapsing into one ambiguous type.

See `docs/product/v1/11-engineering/15-shared-kernel-primitives.md` for the
contract each primitive exposes and how a module is expected to use it,
`docs/product/v1/11-engineering/16-result-and-error-model.md` for the Result and
error model, `docs/product/v1/11-engineering/17-command-query-event-contracts.md`
for the command, query and domain-event contracts, and
`docs/product/v1/11-engineering/18-repository-and-persistence-ports.md` for the
repository, read-port and persistence-failure contracts, and
`docs/product/v1/11-engineering/19-transaction-boundary.md` for the
application-owned transaction-boundary contract, and
`docs/product/v1/11-engineering/21-tenant-context.md` for the tenant-context
contract, and `docs/product/v1/11-engineering/22-optimistic-concurrency.md` for
the shared optimistic-concurrency mechanism.
