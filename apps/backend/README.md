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
    ├── config/                 Environment loading + validation
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

Configuration comes from environment variables (see the repository-root
`.env.example`). The process loads `.env` from `apps/backend` first and falls back to
the repository root, so `cp .env.example .env` at the root is enough for local
development. Validation is fail-fast: an invalid value stops startup with an explicit
error instead of silently falling back (`src/infrastructure/config/environment.ts`).

`MYSQL_PASSWORD`, `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY` are mandatory when
`NODE_ENV=production`. No secret is ever committed or baked into an image
(Engineering Principles, rule 10).

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
