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
Start background jobs       SERVICE_NAME=worker    pnpm --filter @accounting-saas/backend dev:worker
                            SERVICE_NAME=scheduler pnpm --filter @accounting-saas/backend dev:scheduler
                            — or — included in pnpm stack:up (worker + scheduler services)
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

| Command           | Effect                                                                                                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm infra:up`   | Start MySQL, Redis, MinIO (healthchecks gate readiness)                                                                                                                                      |
| `pnpm infra:down` | Stop them; **keeps** the named volumes                                                                                                                                                       |
| `pnpm infra:logs` | Follow infrastructure logs                                                                                                                                                                   |
| `pnpm dev:local`  | **One command:** preflight → `.env` → infrastructure healthy → `db:migrate` → API + Worker + Scheduler with `[api]`/`[worker]`/`[scheduler]` log prefixes; waits for `GET /api/health/ready` |
| `pnpm dev`        | Backend (:3000) + Frontend (:3001) on the host, watching source                                                                                                                              |
| `dev:worker`      | Worker process on the host (consumes the job queue, FND-007)                                                                                                                                 |
| `dev:scheduler`   | Scheduler process on the host (promotes retries, enqueues work)                                                                                                                              |
| `pnpm stack:up`   | Build the dev image and start infrastructure + all processes                                                                                                                                 |
| `pnpm stack:down` | Stop the containerised environment; **keeps** the named volumes                                                                                                                              |
| `pnpm stack:logs` | Follow all container logs                                                                                                                                                                    |
| `pnpm dev:reset`  | Stop everything **and delete** the volumes (clean local state)                                                                                                                               |

First-time setup is `cp .env.example .env` followed by `pnpm install`.

## One-command local bootstrap

From a fresh clone with Docker running, `pnpm run dev:local`
(`tooling/scripts/dev.mjs`) performs the whole startup of section 21 above in a
guaranteed, fail-fast order — infrastructure only, no `app` profile:

```text
preflight   Node ≥ 22, pnpm ≥ 10, docker CLI + daemon, host ports free
            (MYSQL_PORT, REDIS_PORT, MINIO_PORT, MINIO_CONSOLE_PORT, BACKEND_PORT —
            a port held by this project's own Compose stack is not an error)
.env        created from .env.example when missing — an existing .env is never
            touched; required secrets are checked by name only (MYSQL_PASSWORD,
            MYSQL_ROOT_PASSWORD, MINIO_ACCESS_KEY, MINIO_SECRET_KEY)
infra       docker compose up -d --wait mysql redis minio (health-gated;
            on timeout it names the unhealthy service; minio-data-init is a
            one-shot and exiting 0 is normal)
migrations  pnpm --filter @accounting-saas/backend db:migrate (idempotent)
processes   api (built + run), worker and scheduler (watch), logs prefixed
            and colored, never printing a secret value
ready       waits for GET /api/health/ready (default 120 s, configurable
            via DEV_LOCAL_READY_TIMEOUT_MS), then prints the API URL and the
            MinIO console URL
```

SIGINT/SIGTERM stop all backend processes (and their children) and exit; the
Docker services keep running — `pnpm infra:down` stops them and `pnpm
dev:reset` resets the data. Any failing step or crashed process shuts the rest
down and exits non-zero. Rerunning `dev:local` is expected and idempotent.

Troubleshooting: a stopped Docker daemon and a non-project process holding one
of the ports (the message names the port and the variable, e.g. `MYSQL_PORT`)
fail the preflight before anything starts; a failed migration stops the script
before any backend process is started.

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

## Health checks (FND-004)

Three distinct signals, kept apart as required by ADR-015 section 9:

| Signal            | Where                                      | Answers                                               |
| ----------------- | ------------------------------------------ | ----------------------------------------------------- |
| Liveness          | `GET /api/health` (backend)                | Is the process running? Never touches infra.          |
| Readiness         | `GET /api/health/ready` (backend)          | Can it serve requests? 503 when a dependency is down. |
| Dependency health | the `checks` array of the readiness report | Which of MySQL / Redis / object storage is up.        |

- A dependency failure never crashes the backend: readiness answers 503 with a
  stable machine-readable `reason` (`timeout` | `unavailable`); the driver detail
  is logged server-side, redacted, and never returned (06-security-engineering).
- Every probe runs in parallel with a 3s bound, so repeated polling by Compose
  or the frontend panel stays cheap. Both endpoints send `Cache-Control: no-store`.
- **Compose** gives a container one health state, so the `backend` service binds
  it to _readiness_ (`/api/health/ready`): the container is running while MySQL is
  down but must not start its dependants. The `frontend` service is health-checked
  on `/` and only starts after the backend is `healthy`. Infrastructure containers
  keep their own cheap checks (`mysqladmin ping`, `redis-cli ping`,
  `/minio/health/live`).
- Worker and scheduler health (ADR-011, section 6) arrives with their processes;
  the probe list in `apps/backend/src/infrastructure/readiness/` is the single
  place where a dependency is added.
- The `worker` and `scheduler` services expose no port, so Compose cannot health-check
  them the way it health-checks the API (ADR-008, section 9): their signal is the job
  lifecycle in Redis (a `queued → running → completed/failed` record) rather than an
  HTTP probe, which is why neither service declares a Compose `healthcheck`.

## Configuration

- All values are environment-driven and documented in `.env.example`; `.env` is
  git-ignored and must never be committed (Engineering Principles, rule 10).
- Compose fails fast on a missing credential (`${MYSQL_PASSWORD:?...}`) instead of
  silently substituting a default.
- Development-safe defaults exist only for non-secret values (ports, database
  name, bucket name). Credentials have development placeholders in
  `.env.example` and are required in `.env`.
- The backend validates the same values itself before it starts (FND-003): an
  invalid value or a missing credential under `NODE_ENV=production` stops the
  process with a non-zero exit code, naming the variable and never printing its
  value. The Compose anchor above carries `NODE_ENV`, `SERVICE_NAME` and
  `LOG_LEVEL` so containers and host processes read one configuration contract.
- Redis is explicitly **non-authoritative**: application truth lives in MySQL
  (TECH-007). Its append-only file exists for local-development continuity only.

## Verification

Run from a clean state (`pnpm dev:reset`, then the startup flow above):

1. `docker compose ps` — `mysql`, `redis` and `minio` report `healthy`
   (with the `app` profile: `backend` and `frontend` too; the backend state is
   its `/api/health/ready` answer).
2. `GET http://localhost:3000/api/health` — liveness, dependency-free: returns 200
   even while MySQL or Redis is stopped.
3. `GET http://localhost:3000/api/health/ready` — reports `database`, `redis` and
   `object-storage` as `up`; a 503 body reports the dependency that is down with
   a `reason`, and contains no credential or connection detail.
4. `docker compose stop mysql` then repeat 2 and 3 — liveness stays 200, readiness
   returns 503 naming `database`; `docker compose start mysql` returns both to
   healthy (the same applies to `redis` and `minio`).
5. `GET http://localhost:3001` — the shell shows the same readiness report, which
   proves frontend → backend connectivity.
6. Restart (`pnpm infra:down && pnpm infra:up`) and repeat 3 — development data is
   still present because the named volumes survive `down`.
7. `git status --porcelain` / `git log` — no `.env` or secret value is tracked.
8. Background jobs (FND-007): with `dev:worker` running, enqueue
   `pnpm --filter @accounting-saas/backend job:enqueue sample.echo '{"message":"hi"}'`
   and watch the worker log reach `Job completed` with `jobId`, `attempt` and
   `durationMs`. Then enqueue `sample.retry-exhausted`: the log shows bounded
   retries with a growing `retryDelayMs`, then `exhausted its attempts and was
parked` with `status: failed` — while the worker stays up and keeps consuming.

## Local monitoring stack (FND-017)

An opt-in local monitoring stack — Prometheus, Grafana and Alertmanager — lives
in `infrastructure/observability/` under the Compose profile `observability`.
The plain `docker compose up -d` (and `pnpm infra:up`) **never** starts it.

### Starting the stack

```bash
pnpm obs:up     # renders the scrape token, then docker compose --profile observability up -d
pnpm obs:down   # stops the stack again
```

`obs:up` first renders `infrastructure/observability/runtime/metrics_token`
from `METRICS_TOKEN` in `.env` (restrictive permissions, git-ignored, never
echoed) and refuses to start without it, because Prometheus cannot scrape the
deny-by-default `/api/metrics` endpoint without the bearer token (FND-016).

| Service      | URL                        | Notes                                                    |
| ------------ | -------------------------- | -------------------------------------------------------- |
| Prometheus   | http://127.0.0.1:9090      | Scrapes `backend:3000/api/metrics`; alerts on `/alerts`   |
| Grafana      | http://127.0.0.1:3002      | Admin credentials from `.env` (`GRAFANA_ADMIN_*`); datasource and the *Backend* dashboard are provisioned from files |
| Alertmanager | http://127.0.0.1:9093      | **Null receiver** — alerts are visible in the UI and delivered nowhere |

Every published port is bound to `127.0.0.1`: these are operator tools, never
network services. `pnpm obs:check` (also a CI job) proves no token or default
password is committed and no port escapes localhost.

**Scraping needs the containerised backend.** Prometheus targets
`backend:3000` — the Compose service name. A host-run `pnpm dev` backend is not
reachable from the Compose network under that name; run the full
`docker compose --profile app up -d` stack (or override the target) so the
target shows UP. The scrape of the metrics exposition is also the Prom-visible
readiness signal: `GET /api/health/ready` answers JSON, which Prometheus cannot
parse as metrics text, so it stays the Compose healthcheck's job.

### Alert rules (`infrastructure/observability/alerts/rules.yml`)

All alerts fire on *sustained* conditions only — never on a single failed
request or one bad scrape (10-observability, ADR-015 section 7). Each rule has
a firing and a non-firing case in `rules.spec.yml`, executed in CI with
`promtool test rules`.

| Alert | Fires when | Severity |
| ----- | ---------- | -------- |
| `BackendScrapeTargetDown` | The metrics scrape has failed for 3 minutes — the process is down, wedged, or refusing scrapes (readiness) | critical |
| `BackendHttp5xxRateHigh` | Server errors exceed 5% of requests over a 5-minute window, for 5 minutes | critical |
| `BackendJobFailureRateHigh` | More than 20% of job executions failed over the last 15 minutes, for 10 minutes | critical |
| `BackendJobQueueDepthGrowing` | The queue-depth trend keeps rising for 15 minutes — producers outpace workers | warning |
| `OutboxPendingEventsHigh` | More than 50 outbox events un-published for 10 minutes — the transactional outbox is not draining | critical |
| `DatabasePoolWaitingRequests` | Requests have been waiting for a pool connection for 5 minutes | warning |

### Where the files live

```
infrastructure/observability/
├── prometheus/prometheus.yml      # scrape config (bearer token from a file)
├── alerts/rules.yml               # the alert rules above
├── alerts/rules.spec.yml          # promtool tests: firing + non-firing per alert
├── grafana/provisioning/…         # datasource + dashboard provisioning
├── grafana/dashboards/backend.json
├── alertmanager/alertmanager.yml  # null receiver
└── runtime/                       # git-ignored start-up artifacts (token file)
```

Config checks run in CI: `promtool check config` / `check rules`, `promtool
test rules`, `docker compose --profile observability config`, and the static
no-secrets check. Dashboards and rules are files in the repository, reviewed
like code — changes made in the Grafana UI are lost on restart on purpose.

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
