# Backend — Web / REST API

NestJS + TypeScript implementation of the modular monolith (ADR-001, TECH-001).
This app is the `Web / REST API` process; Worker and Scheduler will reuse the same
modules from this codebase in separate processes (ADR-001, section 10).

No business domain is implemented yet — this is the FND-001/FND-002 workspace baseline.

## Layout

```text
src/
├── main.ts                     Process entry point
├── bootstrap.ts                Runtime configuration shared by the process and tests
├── app.module.ts               Root module (shared infrastructure + platform endpoints)
├── modules/                    One directory per domain module (see modules/README.md)
│   └── <module>/{domain,application,infrastructure,presentation}
├── shared/                     Shared kernel (see shared/README.md)
└── infrastructure/
    ├── config/                 Typed configuration (.env discovery, validation, redaction)
    ├── database/               MySQL pool + Drizzle instance
    ├── redis/                  Redis connection (non-authoritative, TECH-007)
    ├── storage/                Object storage port + MinIO adapter (TECH-008)
    ├── readiness/              Dependency probes behind /api/health/ready
    └── presentation/           Operational endpoints (health, readiness)
test/                           HTTP-level (e2e) tests
```

## Commands

```bash
pnpm --filter @accounting-saas/backend dev        # watch mode (nest start --watch)
pnpm --filter @accounting-saas/backend build      # compile to dist/
pnpm --filter @accounting-saas/backend start      # run the compiled build
pnpm --filter @accounting-saas/backend typecheck  # tsc --noEmit
pnpm --filter @accounting-saas/backend lint
pnpm --filter @accounting-saas/backend test       # all tests (unit + HTTP)
pnpm --filter @accounting-saas/backend test:e2e   # HTTP-level tests only
pnpm --filter @accounting-saas/backend test:cov   # coverage
```

From the repository root, `pnpm dev`, `pnpm typecheck`, `pnpm lint` and `pnpm test`
run the whole workspace.

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

| Method | Path                | Purpose                                                                       |
| ------ | ------------------- | ----------------------------------------------------------------------------- |
| GET    | `/api/health`       | Process liveness. Dependency-free: a slow MySQL never restarts a healthy API. |
| GET    | `/api/health/ready` | Readiness. Probes MySQL, Redis and object storage; 503 names the down one.    |

## Rules for new code

See `src/modules/README.md` (module boundaries) and `src/shared/README.md` (shared
kernel). In short: business rules live in `domain/`, use cases in `application/`,
technology in `infrastructure/`, HTTP adapters in `presentation/`, and no module ever
touches another module's internals.
