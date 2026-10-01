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
├── shared/                     Shared kernel (see shared/README.md)
└── infrastructure/
    ├── config/                 Typed configuration (.env discovery, validation, redaction)
    ├── database/               MySQL pool + Drizzle instance
    ├── redis/                  Redis connection (non-authoritative, TECH-007)
    ├── storage/                Object storage port + MinIO adapter (TECH-008)
    ├── readiness/              Dependency probes behind /api/health/ready
    ├── jobs/                   Background-job infrastructure: queue port + Redis Streams
    │                           adapter, dispatcher, retry policy, idempotency, scheduling,
    │                           sample jobs (FND-007)
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
(`LOG_LEVEL`) and `jobs` (`WORKER_CONCURRENCY`, `WORKER_MAX_ATTEMPTS` — reserved for
the worker process, ADR-008).

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

## Rules for new code

See `src/modules/README.md` (module boundaries) and `src/shared/README.md` (shared
kernel). In short: business rules live in `domain/`, use cases in `application/`,
technology in `infrastructure/`, HTTP adapters in `presentation/`, and no module ever
touches another module's internals.
