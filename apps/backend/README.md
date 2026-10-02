# Backend — Web / REST API

NestJS + TypeScript implementation of the modular monolith (ADR-001, TECH-001).
This package hosts three processes that share one codebase and one configuration
(ADR-001, section 10; ADR-008):

| Process   | Entry               | Role                                         |
| --------- | ------------------- | -------------------------------------------- |
| Web/API   | `dist/main.js`      | REST API, serves HTTP requests               |
| Worker    | `dist/worker.js`    | Consumes and executes queued background jobs |
| Scheduler | `dist/scheduler.js` | Enqueues periodic work, promotes due retries |

No business domain is implemented yet — this is the FND-001/FND-002 workspace baseline.

## Layout

```text
src/
├── main.ts                     Web/API process entry point
├── worker.ts                   Worker process entry point (FND-007)
├── scheduler.ts                Scheduler process entry point (FND-007)
├── worker.module.ts            Worker application context (no HTTP)
├── scheduler.module.ts         Scheduler application context (no HTTP)
├── worker-runner.service.ts    Worker consume/dispatch loop
├── scheduler-runner.service.ts Scheduler promote/enqueue loop
├── nest-log-levels.ts          Log-level mapping shared by all processes
├── bootstrap.ts                Runtime configuration shared by the API and tests
├── app.module.ts               Root module (shared infrastructure + platform endpoints)
├── cli/                        Standalone commands (enqueue a job for local runs)
├── modules/                    One directory per domain module (see modules/README.md)
│   └── <module>/{domain,application,infrastructure,presentation}
├── shared/                     Shared kernel, framework-free (see shared/README.md)
│   ├── primitives/             Exact decimal (bigint), rounding modes, calendar, validation
│   ├── id/                     EntityId
│   ├── money/                  Currency + Money
│   ├── quantity/               Quantity
│   ├── time/                   BusinessDate + DateTime
│   ├── errors/                 Result, DomainError, the five categories (SHR-002)
│   ├── messaging/              Command / Query / Domain Event contracts (SHR-003)
│   ├── persistence/            Repository, read-port and failure contracts (SHR-004)
│   ├── transaction/            Transaction boundary contract (SHR-005)
│   └── tenant/                 Tenant context scope + message stamping (SHR-007)
└── infrastructure/
    ├── config/                 Typed configuration (.env discovery, validation, redaction)
    ├── database/               MySQL pool + Drizzle instance + transaction runner (SHR-005)
    ├── redis/                  Redis connection (non-authoritative, TECH-007)
    ├── storage/                Object storage port + MinIO adapter (TECH-008)
    ├── readiness/              Dependency probes behind /api/health/ready
    ├── jobs/                   Background-job infrastructure: queue port + Redis Streams
    │                           adapter, dispatcher, retry policy, idempotency, scheduling,
    │                           sample jobs (FND-007)
    ├── outbox/                 Transactional outbox: recorder, store, publisher, Redis
    │                           event bus adapter, outbox job/schedule (SHR-006)
    ├── api/                    Cross-cutting REST baseline: versioning, error contract,
    │                           validation, pagination, serialization, OpenAPI (FND-006)
    └── presentation/           Operational + reference endpoints (health, example)
test/                           HTTP-level (e2e) tests, incl. job integration tests
```

## Commands

```bash
pnpm --filter @accounting-saas/backend dev        # API watch mode (nest start --watch)
pnpm --filter @accounting-saas/backend dev:worker      # Worker watch mode
pnpm --filter @accounting-saas/backend dev:scheduler   # Scheduler watch mode
pnpm --filter @accounting-saas/backend build      # compile to dist/
pnpm --filter @accounting-saas/backend start      # run the compiled API
pnpm --filter @accounting-saas/backend start:worker      # run the compiled Worker
pnpm --filter @accounting-saas/backend start:scheduler   # run the compiled Scheduler
pnpm --filter @accounting-saas/backend typecheck  # tsc --noEmit
pnpm --filter @accounting-saas/backend lint
pnpm --filter @accounting-saas/backend test       # all tests (unit + HTTP)
pnpm --filter @accounting-saas/backend test:e2e   # HTTP-level tests only
pnpm --filter @accounting-saas/backend test:cov   # coverage

# Background jobs (FND-007)
pnpm --filter @accounting-saas/backend job:enqueue <type> [payload-json]
REDIS_INTEGRATION=1 pnpm --filter @accounting-saas/backend test   # + Redis-backed job tests

# Transaction boundary and transactional outbox against a real MySQL server (SHR-005, SHR-006)
MYSQL_INTEGRATION=1 pnpm --filter @accounting-saas/backend test   # + MySQL-backed transaction & outbox tests
```

From the repository root, `pnpm dev`, `pnpm typecheck`, `pnpm lint` and `pnpm test`
run the whole workspace, and `pnpm verify` runs the complete baseline verification
(Typecheck → Lint → Format check → Tests → Build) — the same command CI executes.

## Runtime and module system

The backend is an **ESM** package (`"type": "module"`, TypeScript `nodenext`). NestJS 12
packages are ESM-only, so CommonJS output cannot load them. Relative imports therefore
carry an explicit `.js` extension (`import { AppModule } from './app.module.js'`), which
is what Node resolves at runtime.

Tests run on **Vitest**, not Jest, because Vitest resolves and executes ESM natively.
SWC compiles the test sources (`unplugin-swc`) so that `emitDecoratorMetadata` is
available for Nest's dependency injection.

## Configuration

The environment is read in exactly one place — `src/infrastructure/config/` — and is
consumed everywhere else as a typed object. `process.env` outside that directory (and
outside `apps/frontend/lib/env.ts`) is a lint error, so the boundary is enforced
mechanically rather than by review.

**Values.** Everything the process needs is declared in the repository-root
`.env.example`, with `cp .env.example .env` enough for local development. Loading is
owned by `dotenv.ts` and runs in this order: repository-root `.env`, then
`apps/backend/.env`, then the real process environment — later sources win, and a
value already present in the process is never overwritten by a file. There is no
second mechanism: `@nestjs/config` was removed in favour of `dotenv` read directly.

**Validation** (`configuration.ts`) is fail-fast and framework-free, so the HTTP, worker
and scheduler processes call the same function:

- every invalid value is collected and reported together, each message naming the
  variable and never echoing its value;
- `NODE_ENV` must be one of `development`, `test`, `production`; `LOG_LEVEL` one of
  `debug`, `info`, `warn`, `error`;
- `MYSQL_PASSWORD`, `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY` are mandatory when
  `NODE_ENV=production` and optional in development/test, so a fresh checkout boots
  and `GET /api/health/ready` reports the missing dependency instead;
- `main.ts` loads and validates before `NestFactory.create`, so an invalid value stops
  the process before anything is half-started, with a non-zero exit code.

**Secrets** never appear in logs, error output or health responses: `secrets.ts`
exposes a redactor bound to the known secret environment keys, and it is applied to
startup failures, dependency-probe errors and connection warnings. No secret is ever
committed or baked into an image (Engineering Principles, rule 10).

**Grouping.** `configuration.types.ts` groups the values into `environment`
(identification plus the derived `isDevelopment`/`isTest`/`isProduction` flags),
`runtime` (`SERVICE_NAME`), `http`, `database`, `redis`, `storage`, `logging`
(`LOG_LEVEL`), `jobs` (`WORKER_CONCURRENCY`, `WORKER_MAX_ATTEMPTS` — reserved for
the worker process, ADR-008), `scheduler` (`SCHEDULER_INTERVAL_MS`) and `outbox`
(`OUTBOX_BATCH_SIZE`, `OUTBOX_MAX_ATTEMPTS`, `OUTBOX_RETRY_*`,
`OUTBOX_PUBLISH_INTERVAL_MS` — the publication contract of SHR-006).

The database pool, the Redis connection and the MinIO client are all created
without opening a connection, so the API process starts even when the
infrastructure is not running yet; `GET /api/health/ready` reports the actual
state of each dependency. Start the local dependencies with `pnpm infra:up` from
the repository root.

## Endpoints

Operational endpoints only — no business rule lives here (ADR-002, section 16),
and they follow the same REST style as every other controller (ADR-013).

| Method | Path                | Purpose                                                                                                     |
| ------ | ------------------- | ----------------------------------------------------------------------------------------------------------- |
| GET    | `/api/health`       | **Liveness.** The process is running. Dependency-free: a stopped MySQL never makes a healthy API look dead. |
| GET    | `/api/health/ready` | **Readiness.** Probes MySQL, Redis and object storage in parallel; 200 when all are up, 503 otherwise.      |

```jsonc
// GET /api/health → 200
{ "status": "ok", "service": "backend", "environment": "development", "timestamp": "2026-09-29T09:22:34.673Z" }

// GET /api/health/ready → 200 (503 returns exactly the same shape when not ready)
{
  "status": "ready",
  "checks": [
    { "name": "database", "status": "up", "latencyMs": 24 },
    { "name": "redis", "status": "up", "latencyMs": 20 },
    { "name": "object-storage", "status": "up", "latencyMs": 18 }
  ]
}
```

Contract notes:

- A down dependency reports `"status": "down"` plus a closed `"reason"` —
  `timeout` or `unavailable`. Driver text, hostnames, connection strings and
  credentials are **never** serialized: the redacted detail goes to the server
  log instead (06-security-engineering — error output must not disclose
  internals). A failed dependency is reported, never crashes the process
  (ADR-015, section 9 — liveness and readiness stay separate).
- Both endpoints answer with `Cache-Control: no-store` and only in-memory work
  plus bounded parallel probes (3s timeout), so repeated polling from Compose
  health checks or the frontend panel stays cheap.
- Docker Compose binds the `backend` container's single health state to
  **readiness** (`/api/health/ready`); use `/api/health` where only "the process
  is alive" is meant.

## REST API and OpenAPI baseline (FND-006)

The API conventions are installed once, in `bootstrap.ts`, so no module
configures them per controller (full reference:
`docs/product/v1/11-engineering/13-api-conventions.md`).

- **Base route and versioning.** Global prefix `/api` plus URI versioning with
  default version `1`. A business endpoint is `/api/v1/<resource>`; a controller
  declares a plain `@Controller('<resource>')` and never a version segment.
  Operational endpoints are `VERSION_NEUTRAL` and stay at `/api/health`.
- **Validation.** One global validation pipe rejects unknown properties,
  transforms the request into its DTO and returns per-field detail. It does not
  replace a domain invariant.
- **Errors.** Every failure leaves in the standard contract
  `{ error: { code, category, message, correlationId, details? } }`, produced by
  a global exception filter. A 5xx never contains a stack trace or the exception
  message; the detail is logged server-side, redacted. A business failure is a
  `DomainError` subclass from `src/shared/errors/` (thrown by domain/application)
  and maps to `422` with category `domain`.
- **Pagination.** List endpoints reuse `PaginationQueryDto` (`page`/`limit`) and
  return `{ data, meta: { page, limit, total, totalPages } }`.
- **Serialization.** UUID ids, ISO-8601 UTC date-times, `YYYY-MM-DD` calendar
  dates, money as `{ amount: "<decimal string>", currency }`, enums as strings
  and nullable fields present with `null` (helpers in
  `infrastructure/api/serialization/`).
- **OpenAPI.** The document is generated from the running app and served in
  development and test only:

| Resource     | URL                                   |
| ------------ | ------------------------------------- |
| Swagger UI   | `http://localhost:3000/api/docs`      |
| OpenAPI JSON | `http://localhost:3000/api/docs-json` |
| OpenAPI YAML | `http://localhost:3000/api/docs-yaml` |

### Reference endpoints

`ExampleController` is a non-business reference resource that demonstrates the
conventions (validation, success, error, pagination). It is not a domain and is
replaced by the first real module.

| Method | Path                                  | Purpose                                                    |
| ------ | ------------------------------------- | ---------------------------------------------------------- |
| POST   | `/api/v1/examples`                    | Validate a body and create a reference item (`201`)        |
| GET    | `/api/v1/examples`                    | List with the standard pagination envelope                 |
| GET    | `/api/v1/examples/:id`                | Fetch one item, or the standard `404` error                |
| GET    | `/api/v1/examples/probe/server-error` | Development/test only: raises a `500` to show the contract |

## Background jobs (FND-007)

Async work runs outside the HTTP request lifecycle, in the Worker process; the
Scheduler only produces work. Full conventions:
`docs/product/v1/11-engineering/14-background-jobs.md`.

- **Queue.** A `JobQueuePort` implemented with **Redis Streams** and a consumer
  group, so each envelope reaches one Worker at a time and survives a crash.
  Redis stays infrastructure only (TECH-007); a payload is never inspected by the
  queue, so a new job type needs no queue change.
- **Defining a job.** `defineJob<Payload>({ type, execute })` registered in
  `JobsModule`. A duplicate type is rejected at startup; an unregistered type
  reached by the Worker becomes a visible terminal failure, never a crash.
- **Lifecycle.** `queued → running → completed | retrying | failed`. State is
  written before the stream entry is acknowledged, so no outcome is hidden.
- **Retry.** Only `RetryableJobError` is retried, with exponential jittered
  backoff (`WORKER_RETRY_*`) capped by `WORKER_MAX_ATTEMPTS`. A `TerminalJobError`
  or an unexpected error is never retried — an unknown outcome is not safe to
  repeat. An exhausted budget parks the job as `failed` for review.
- **Idempotency.** A definition may declare an `idempotencyKey`; a duplicate
  delivery of a completed job is skipped instead of repeating its effect.
- **Observability.** Every execution emits one structured JSON line with
  `jobId`, `type`, `attempt`, `maxAttempts`, `correlationId`, `status`,
  `durationMs` and the failure category (redacted), ready for a metrics layer.
- **Crash recovery.** Entries whose consumer died before acknowledging are
  reclaimed after a visibility timeout (`JOB_VISIBILITY_TIMEOUT_MS`).

Local run (Redis must be up: `pnpm infra:up`):

```bash
# two terminals
SERVICE_NAME=worker    pnpm --filter @accounting-saas/backend dev:worker
SERVICE_NAME=scheduler pnpm --filter @accounting-saas/backend dev:scheduler

# a third: enqueue a sample job (infrastructure-only, no business logic)
pnpm --filter @accounting-saas/backend build
pnpm --filter @accounting-saas/backend job:enqueue sample.echo '{"message":"hi"}'
pnpm --filter @accounting-saas/backend job:enqueue sample.retry-then-succeed '{"succeedOnAttempt":3}'
pnpm --filter @accounting-saas/backend job:enqueue sample.retry-exhausted
pnpm --filter @accounting-saas/backend job:enqueue sample.terminal-failure
```

Sample job types live in `src/infrastructure/jobs/sample/`: `sample.echo`,
`sample.retry-then-succeed`, `sample.retry-exhausted`, `sample.terminal-failure`,
plus the `sample.periodic-echo` schedule that the Scheduler enqueues. They log,
throw and complete — they perform no business operation.

## Shared kernel primitives (SHR-001)

`src/shared/` holds the framework-independent value objects every module uses for
identifiers, money, quantities and dates. Full contract:
`docs/product/v1/11-engineering/15-shared-kernel-primitives.md`.

```ts
import { RoundingMode } from '../shared/primitives/rounding-mode.js';
import { Currency } from '../shared/money/currency.js';
import { Money } from '../shared/money/money.js';
import { BusinessDate } from '../shared/time/business-date.js';
import { EntityId } from '../shared/id/entity-id.js';

const total = price.multiply(quantity, RoundingMode.HALF_UP); // rounding is mandatory
const vat = total.multiply('0.10', RoundingMode.HALF_UP);
const issuedOn = BusinessDate.parse(payload.issuedOn); // YYYY-MM-DD, no timezone
const id = EntityId.generate();
```

- **No floating point.** `Money` and `Quantity` store an exact decimal on `bigint`;
  `0.1 + 0.2` is `0.3`, never `0.30000000000000004`.
- **Amount and currency stay together.** Mixing currencies or units is rejected, not
  coerced. `Currency.register(...)` adds a currency without touching any domain code;
  the MVP registers `IRR` only.
- **Invalid states are rejected** with `InvalidPrimitiveError`, naming the primitive
  and the field — distinct from `DomainError`, which stays for client-safe business
  failures.
- **Four temporal roles stay distinct**: Business Date and Accounting Date are
  `BusinessDate` (`YYYY-MM-DD`); Created At and Posted At are `DateTime` (UTC
  instant). Name the field for the role.
- **No framework dependency.** `src/shared/framework-independence.spec.ts` walks the
  folder and fails the test run if a file imports anything beyond `node:*` and
  sibling files inside `shared/`.

## Result and error model (SHR-002)

`src/shared/errors/` holds the framework-free model for _expected_ failures. Full
contract: `docs/product/v1/11-engineering/16-result-and-error-model.md`.

```ts
import { Result } from '../shared/errors/result.js';
import { NotFoundError, StateViolationError } from '../shared/errors/category-errors.js';

if (period === undefined) {
  return Result.fail(new NotFoundError('No open period for that date.'));
}
return Result.ok(invoice);
```

- **The boundary, stated in types:** expected domain failure → `Result` /
  `DomainError`; unexpected technical failure → throw, and let the infrastructure
  turn it into `INTERNAL_ERROR`. The domain never maps, logs or serializes.
- **`DomainError`** carries a stable upper-snake `code`, a shared `category`
  (`VALIDATION` | `BUSINESS_RULE` | `CONFLICT` | `NOT_FOUND` | `STATE_VIOLATION`),
  optional structured `details`, and a `toJSON()` snapshot. `cause` is deliberately
  excluded from that snapshot, because a cause is where a technical exception tends
  to hide. Instances are frozen.
- **`Result`** exposes safe `value()` / `error()` reads, `match`, `map`, `mapError`,
  `andThen`, `orElse`, `getOrElse`, and `Result.all(...)` to compose many outcomes
  into one that reports _every_ failure. Its combinators do not catch exceptions.
- **Details are serializable by construction**: `code` + `message` + optional
  `field` plus primitive extras only. Objects, arrays and non-finite numbers are
  rejected, so a stack trace or a query cannot ride along.
- No NestJS, HTTP, ORM, Redis or MySQL import is permitted here —
  `src/shared/framework-independence.spec.ts` fails the run if one appears.

## Command / Query / Event contracts (SHR-003)

`src/shared/messaging/` holds the framework-free contracts modules communicate through.
Full contract: `docs/product/v1/11-engineering/17-command-query-event-contracts.md`.

```ts
import { Command } from '../shared/messaging/command.js';
import { DomainEvent } from '../shared/messaging/domain-event.js';
import { causedBy } from '../shared/messaging/message.js';

class PostAccountingDocument extends Command<PostingPayload> {
  constructor(payload: PostingPayload, options?: MessageOptions) {
    super('PostAccountingDocument', payload, options);
  }
}

class AccountingDocumentPosted extends DomainEvent<PostedData> {
  constructor(data: PostedData, options?: MessageOptions) {
    super('AccountingDocumentPosted', data, options);
  }
}

const event = new AccountingDocumentPosted(data, causedBy(command));
```

- **Three readings, enforced at construction:** `Command` = intent (`PostAccountingDocument`),
  `Query` = read (`GetSupplierBalance`), `DomainEvent` = past-tense fact
  (`AccountingDocumentPosted`). A fact-shaped command name or an intent-shaped event
  name throws `InvalidPrimitiveError` before an instance exists.
- **Shared envelope:** `kind` + stable `name` + `metadata` (`messageId`, `messageType`,
  `timestamp`, `version`, and optional `tenantId`, `correlationId`, `causationId`) plus
  the body — `payload` / `params` / `data`. No HTTP, Redis, ORM or provider type is
  referenced, and nothing business-specific lives in the kernel.
- **Immutable value snapshots:** the message is frozen and its body deep-frozen, so
  pass plain, self-contained data — never a live entity.
- **`causedBy(source)`** links an effect to its cause: causation id, the flow's
  correlation and the tenant are inherited; an explicit option always wins.
- **Tenant context is resolved by the application** from the authenticated principal,
  never taken from a client-supplied field; **event versions** are explicit (`1..9999`,
  default `1`) so consumers can evolve (ADR-005, section 11).
- Buses, outbox, persistence and delivery are deliberately not here — they are
  Infrastructure work, out of scope for the shared kernel.

## Repository and persistence ports (SHR-004)

`src/shared/persistence/` holds the framework-free contracts a module declares its
repository from. Full contract:
`docs/product/v1/11-engineering/18-repository-and-persistence-ports.md`.

```ts
import { LoadsById, UpdatesAggregate } from '../shared/persistence/repository-ports.js';
import { Revision } from '../shared/persistence/revision.js';
import { PersistenceError } from '../shared/persistence/persistence-error.js';

// domain/ — the module's own repository, assembled from the shared capabilities
export interface AccountingDocumentsRepository
  extends LoadsById<EntityId, AccountingDocument>, UpdatesAggregate<AccountingDocument> {}

// application/ — load, change in Domain, write against the revision read
const loaded = await repository.get(id); // absent → undefined, not an error
if (loaded === undefined) return Result.fail(new NotFoundError('No open document.'));
await repository.update(changed, loaded.revision); // stale → PersistenceError(CONFLICT)
```

- **Ownership first.** The repository belongs to the module that owns the data:
  interface in that module's `domain/`, adapter in its
  `infrastructure/persistence/`. Another module imports neither (ADR-003).
- **No generic repository.** The kernel ships capabilities — `get`, `add`,
  `update`, `exists`, `find` — plus `ReadPort`; no `GenericRepository`, no
  criteria builder, no `query()`, no `delete`. A module adds its own methods over
  closed criteria types only.
- **Optimistic concurrency by construction.** Every write names the
  `expectedRevision` it believes is current, so a stale write is a `CONFLICT`
  instead of a silent overwrite (ADR-004, section 27) — which is also what keeps
  historical records from being rewritten.
- **One failure boundary.** Adapters translate driver problems into
  `PersistenceError` (`UNAVAILABLE` retryable, `TIMEOUT`/`UNKNOWN` with an
  unknown outcome that must be verified before any retry); the use case catches
  it at the boundary, maps a conflict through `toDomainError()` into the shared
  `ConflictError`, and lets everything else stay a thrown technical failure.
- **Read ports are separate** (`ReadPort`): read-only, module-owned criteria with
  the company scope the application resolved, plain serializable read models out —
  never an aggregate.
- **Enforced, not promised.** `src/shared/persistence/persistence-conventions.spec.ts`
  and `src/modules/module-boundaries.spec.ts` fail the run on a delete, a generic
  repository, an implementation token, an impure Domain import or a cross-module
  reach into another module's persistence.

## Transaction boundary (SHR-005)

`src/shared/transaction/` holds the framework-free contract that makes several
persistence operations commit or roll back as one unit; the mechanics live in
`src/infrastructure/database/` (`DrizzleTransactionRunner`, `scopedDatabase`).
Full contract: `docs/product/v1/11-engineering/19-transaction-boundary.md`.

```ts
import { Inject } from '@nestjs/common';
import { TRANSACTION_BOUNDARY } from '../infrastructure/database/database.tokens.js';
import type { TransactionBoundary } from '../shared/transaction/transaction-boundary.js';

constructor(
  @Inject(TRANSACTION_BOUNDARY) private readonly transactions: TransactionBoundary,
) {}

async execute(command: PostInvoice): Promise<Result<Invoice, DomainError>> {
  try {
    return await this.transactions.execute(async () => {
      const customer = await this.customers.get(command.customerId); // joins the boundary
      if (customer === undefined) return Result.fail(new NotFoundError('No such customer.'));
      await this.invoices.add(invoice); // same connection, same boundary
      await this.ledger.post(posting);   // commits with it — or rolls back with it
      return Result.ok(invoice);
    });
  } catch (error) {
    if (error instanceof PersistenceError) {
      const domainError = error.toDomainError();
      if (domainError !== undefined) return Result.fail(domainError); // CONFLICT
    }
    throw error;
  }
}
```

- **Application owns the boundary.** One `execute(...)` per unit of work: it
  commits when the work resolves with no failure reported and rolls everything
  back when it throws, when a failed `Result` surfaces, or when a failure inside
  was swallowed (`TransactionBoundaryError`, cause = the original failure).
- **Nesting joins, never forks.** A second `execute` inside an open boundary
  participates in it — no second commit, no savepoint — so an inner operation
  can never commit half a use case.
- **Repositories participate, never open.** Adapters call `scopedDatabase(db)`:
  inside a boundary they get its transaction handle, outside one a plain
  connection. Domain never sees any of this — `module-boundaries.spec.ts`
  fails the run if `domain/` imports `src/shared/transaction/`.
- **Propagation is a `node:async_hooks` store** (`TransactionContext`), visible
  through the async chain of the running `execute` only; no HTTP middleware,
  no Redis, no provider API.
- **Rollback covers database effects only.** An external call made inside the
  boundary (provider API, object storage, notification) keeps its effect and
  needs retry / compensation outside it (ADR-004, sections 9 and 12–13).
- **Concurrency is unchanged.** Writes still name their `expectedRevision`; a
  conflict inside a boundary (`PersistenceError(CONFLICT)` → `ConflictError`)
  rolls the boundary back instead of overwriting the winner's row.
- **Tests.** `src/shared/transaction/*.spec.ts` and
  `src/infrastructure/database/scoped-database.spec.ts` prove the semantics in
  unit runs; `test/transaction-boundary.e2e-spec.ts` (opt-in,
  `MYSQL_INTEGRATION=1`) proves them on a real MySQL server — commit, rollback,
  invisibility until commit, concurrent conflict, and the database/external
  effect line.

## Transactional outbox (SHR-006)

`src/infrastructure/outbox/` records a domain event inside the same transaction
as the state change it reports, then publishes it to the Redis event stream from
a background loop — so no code ever writes the database and Redis at the same
time. Full contract:
`docs/product/v1/11-engineering/20-transactional-outbox.md`.

```ts
import { Inject } from '@nestjs/common';
import { OUTBOX_RECORDER } from '../infrastructure/outbox/outbox.tokens.js';
import type { OutboxRecorder } from '../infrastructure/outbox/outbox-recorder.js';

constructor(@Inject(OUTBOX_RECORDER) private readonly outbox: OutboxRecorder) {}

async execute(command: PostInvoice): Promise<Result<Invoice, DomainError>> {
  return this.transactions.execute(async () => {
    await this.invoices.add(invoice);
    // Same transaction as the write above: commit together, roll back together.
    await this.outbox.record(new InvoicePosted(data, causedBy(command)));
    return Result.ok(invoice);
  });
}
```

- **Recording requires an open boundary.** `record` throws
  `OutboxTransactionRequiredError` with no transaction on the stack — the row
  must ride the use case's connection or the atomicity promise is void.
- **Identity is fixed at record time.** The row stores the envelope once
  (`event_id` = `metadata.messageId`, unique) and every attempt republishes the
  same bytes; consumers deduplicate on that id. Exactly-once is not claimed —
  at-least-once plus idempotent consumers is (ADR-004, section 15).
- **State machine:** `pending → publishing → published`, with `retrying`
  (bounded, jittered backoff) and `failed` (permanent failure or exhausted
  attempts, kept forever and recoverable via `requeue`). The claim is an atomic
  `UPDATE … ORDER BY … LIMIT` under a fresh `claim_id`, so concurrent publishers
  split a batch instead of double-publishing it.
- **The Worker publishes it.** The Scheduler enqueues `outbox.publish` every
  `OUTBOX_PUBLISH_INTERVAL_MS`; the job runs one `publishBatch` and logs the full
  account (`released/claimed/published/retrying/failed`). A crashed run's rows
  are released after a 60s visibility timeout and retried — a duplicate delivery
  with the same `event_id`, never a silent loss.
- **Configuration** (`OUTBOX_BATCH_SIZE`, `OUTBOX_MAX_ATTEMPTS`,
  `OUTBOX_RETRY_BASE_DELAY_MS`, `OUTBOX_RETRY_MAX_DELAY_MS`,
  `OUTBOX_PUBLISH_INTERVAL_MS`) is validated once with every other contract and
  read through `config.outbox`.
- **Tests.** `src/infrastructure/outbox/*.spec.ts` prove the recorder, the state
  machine, the job tick and the Redis adapter against ports;
  `test/outbox.e2e-spec.ts` (opt-in, `MYSQL_INTEGRATION=1`) proves the real
  server behavior — invisible until commit, rollback leaves nothing to publish,
  backoff gating, permanent → failed → requeue, exhausted budget, crashed-run
  recovery, and two concurrent publishers never claiming the same row.

## Tenant context (SHR-007)

`src/shared/tenant/` holds the framework-free abstraction for the company
boundary an operation runs under: a `TenantContext` with three states
(`available`, explicit `system`, `missing`) and the ambient `TenantScope` that
propagates it down the async call chain on `node:async_hooks` — the same
mechanism as the transaction boundary, with no HTTP, NestJS, Redis or database
type underneath. Full contract:
`docs/product/v1/11-engineering/21-tenant-context.md`.

```ts
import { TenantScope } from '../shared/tenant/tenant-scope.js';
import { tenantScopedMessageOptions } from '../shared/tenant/tenant-message-options.js';

// A trusted entry point (today: the Worker / a test; later: the auth guard)
// establishes the scope; everything below reads it without a parameter.
await TenantScope.run(createTenantContext(companyId, { correlationId }), async () => {
  const tenant = TenantScope.require(); // throws TenantContextMissingError when absent
  return new PostInvoice(payload, tenantScopedMessageOptions());
});
```

- **Three states, fail closed.** `TenantScope.current()` is always one of
  `available` (tenant + optional correlation), `system` (explicitly no tenant —
  infrastructure jobs), or `missing`. `require()` and
  `tenantScopedMessageOptions()` throw `TenantContextMissingError` unless the
  scope is available, so a tenant-scoped operation refuses to run rather than
  degrading to a wider one.
- **Never from the client.** No header, body or query is ever read as tenant
  identity (doc 17, §8): the context is established only from a trusted
  boundary — an authenticated principal (later), a job envelope (now), a test.
  The e2e proves a spoofed `x-tenant-id` header stays `missing`.
- **Messages stamp themselves.** `tenantScopedMessageOptions()` fills
  `metadata.tenantId`/`correlationId` from the ambient scope, with an explicit
  value (e.g. `causedBy(command)` inheriting its cause's tenant) always winning.
- **Jobs restore their context.** `JobEnqueuer` defaults `companyId` and
  `correlationId` from the ambient scope; `JobDispatcher` restores
  `envelope.companyId` around the execution (`run` / `runAsSystem`). A job
  declaring `tenantScoped: true` without a `companyId` never runs — it is
  parked as terminal (ADR-008, §12/§14).
- **Domain stays explicit.** `module-boundaries.spec.ts` fails the run if
  `domain/` imports `src/shared/tenant/`: Domain receives the tenant scope as
  an operation input, never through ambient state.
- **Tests.** `src/shared/tenant/*.spec.ts` cover creation, validation,
  propagation, concurrent isolation and nesting;
  `src/infrastructure/jobs/*.spec.ts` cover envelope restore and the
  tenant-scoped refusal; `test/tenant-context.e2e-spec.ts` proves spoofed
  headers, concurrent-request isolation and no cross-request leakage over real
  HTTP.

## Rules for new code

See `src/modules/README.md` (module boundaries) and `src/shared/README.md` (shared
kernel). In short: business rules live in `domain/`, use cases in `application/`,
technology in `infrastructure/`, HTTP adapters in `presentation/`, and no module ever
touches another module's internals. Amounts, quantities, identifiers and dates come
from `src/shared/`, never from a hand-rolled type in a module. Expected failures
are returned as `Result`, not thrown; unexpected ones are thrown, not returned.
Modules talk to each other only through the command, query and domain-event
contracts in `src/shared/messaging/` — never through another module's entity,
repository or table. Data access goes through each module's own repository ports
built from `src/shared/persistence/`; no shared connection ever becomes a free
query surface. Operations that must commit together run inside one
`TransactionBoundary.execute(...)` from `src/shared/transaction/`, and
repositories join it through `scopedDatabase(...)` — a repository never opens a
transaction of its own, and Domain code never touches the contract.
