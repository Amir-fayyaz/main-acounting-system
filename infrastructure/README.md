# Infrastructure

Technical, deployment-oriented assets live here. This directory must never contain
domain or business logic (see ADR-002, section 14 — Shared Infrastructure).

## Local development environment (FND-002)

The whole local environment is defined in the repository-root `docker-compose.yml`
and is reproducible from a clean checkout:

| Service  | Compose service               | Image (pinned)                              | Purpose                                          | Persistence         |
| -------- | ----------------------------- | ------------------------------------------- | ------------------------------------------------ | ------------------- |
| MySQL    | `mysql`                       | `mysql:8.4`                                 | System of record (TECH-003)                      | `mysql-data` volume |
| Redis    | `redis`                       | `redis:8-alpine`                            | Event bus / queue / controlled caches (TECH-007) | `redis-data` volume |
| MinIO    | `minio` (+ `minio-data-init`) | `alpine/minio:RELEASE.2025-10-15T17-29-55Z` | S3-compatible object storage (TECH-008)          | `minio-data` volume |
| Backend  | `backend` (profile `app`)     | `accounting-saas/app-dev` (built)           | Web / REST API process                           | none (stateless)    |
| Frontend | `frontend` (profile `app`)    | `accounting-saas/app-dev` (built)           | Next.js web client                               | none (stateless)    |

The application containers are behind the `app` profile so that the default
`docker compose up -d` starts **infrastructure only** and the host-based
`pnpm dev` loop stays the fast path. `docker compose --profile app up -d` starts
everything in containers.

## Startup flow

```text
Start infrastructure        pnpm infra:up          (or: docker compose up -d)
        ↓
Start application           pnpm dev               (host)
                            — or —
                            pnpm stack:up          (containers, profile `app`)
        ↓
Verify service health       pnpm docker compose ps         (all `healthy`)
                            GET http://localhost:3000/api/health/ready
                            GET http://localhost:3001       (frontend shell)
        ↓
Develop                     pnpm dev (watch mode, hot reload)
        ↓
Stop environment            pnpm infra:down / pnpm stack:down
                            development data stays in the named volumes
```

### Commands

| Command           | Effect                                                           |
| ----------------- | ---------------------------------------------------------------- |
| `pnpm infra:up`   | Start MySQL, Redis, MinIO (healthchecks gate readiness)          |
| `pnpm infra:down` | Stop them; **keeps** the named volumes                           |
| `pnpm infra:logs` | Follow infrastructure logs                                       |
| `pnpm dev`        | Backend (:3000) + Frontend (:3001) on the host, watching source  |
| `pnpm stack:up`   | Build the dev image and start infrastructure + both applications |
| `pnpm stack:down` | Stop the containerised environment; **keeps** the named volumes  |
| `pnpm stack:logs` | Follow all container logs                                        |
| `pnpm dev:reset`  | Stop everything **and delete** the volumes (clean local state)   |

First-time setup is `cp .env.example .env` followed by `pnpm install`.

## Networking

- Every service joins the single Compose bridge network `accounting`.
- Containers address each other by **Compose service name** (`mysql`, `redis`,
  `minio`, `backend`) — never by a host address or `localhost`. Compose injects
  those hostnames into the application containers, so no machine-specific address
  is written in source or in `.env`.
- Published ports (`MYSQL_PORT`, `REDIS_PORT`, `MINIO_PORT`, `BACKEND_PORT`,
  `FRONTEND_PORT`) exist for **host-run processes only**; inside the network the
  services always listen on their standard ports (3306 / 6379 / 9000 / 3000).
- The frontend uses two URLs on purpose: `INTERNAL_API_BASE_URL` (server-side,
  `http://backend:3000/api` inside the network) and `NEXT_PUBLIC_API_BASE_URL`
  (browser-side, a host-reachable address).

## Configuration

- All values are environment-driven and documented in `.env.example`; `.env` is
  git-ignored and must never be committed (Engineering Principles, rule 10).
- Compose fails fast on a missing credential (`${MYSQL_PASSWORD:?...}`) instead of
  silently substituting a default.
- Development-safe defaults exist only for non-secret values (ports, database
  name, bucket name). Credentials have development placeholders in
  `.env.example` and are required in `.env`.
- Redis is explicitly **non-authoritative**: application truth lives in MySQL
  (TECH-007). Its append-only file exists for local-development continuity only.

## Verification

Run from a clean state (`pnpm dev:reset`, then the startup flow above):

1. `docker compose ps` — `mysql`, `redis` and `minio` report `healthy`
   (with the `app` profile: `backend` too).
2. `GET http://localhost:3000/api/health` — process liveness, always dependency-free.
3. `GET http://localhost:3000/api/health/ready` — reports `database`, `redis` and
   `object-storage` as `up`; a 503 body names the dependency that is down.
4. `GET http://localhost:3001` — the shell shows the same readiness report, which
   proves frontend → backend connectivity.
5. Restart (`pnpm infra:down && pnpm infra:up`) and repeat 3 — development data is
   still present because the named volumes survive `down`.
6. `git status --porcelain` / `git log` — no `.env` or secret value is tracked.

## Open decision — MinIO container images

TECH-008 approves MinIO as the MVP file storage provider. MinIO stopped publishing
the official `minio/minio` images in October 2025 (minio/minio#21647) and the
repository was archived, so there is no official image left to pin.

For local development the Compose file therefore pins
`alpine/minio:RELEASE.2025-10-15T17-29-55Z`, built from the official release
binary by a Docker Hub Sponsored OSS publisher, plus a one-shot `minio-data-init`
container that hands the fresh volume to the non-root MinIO user.

A technology decision note (or an update to TECH-008) is still required before the
Files module is implemented. It must cover: which image is used for local
development, which provider serves production/pilot, and how the storage
abstraction stays provider-agnostic per TECH-008.

## Adding infrastructure

When adding shared infrastructure:

1. Wrap it behind a port/contract owned by the consuming module (ADR-002, section 15).
2. Keep configuration in Infrastructure, never in Domain (ADR-002, section 21).
3. Add the service to `docker-compose.yml` with a healthcheck and pinned image tag.
4. Document environment variables in `.env.example`.
5. Expose the dependency through a readiness probe in
   `apps/backend/src/infrastructure/readiness/`.
6. Record a decision if the choice deviates from the approved technology decisions.
