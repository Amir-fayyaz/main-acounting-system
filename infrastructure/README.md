# Infrastructure

Technical, deployment-oriented assets live here. This directory must never contain
domain or business logic (see ADR-002, section 14 — Shared Infrastructure).

## Current state (FND-001)

| Concern                | Local development            | Notes                                                     |
| ---------------------- | ---------------------------- | --------------------------------------------------------- |
| MySQL                  | `docker compose up -d mysql` | MySQL 8.4, utf8mb4, `READ-COMMITTED` isolation            |
| Redis                  | `docker compose up -d redis` | Internal event bus / queue backend per TECH-007           |
| Backend (Web/REST API) | `pnpm dev:backend`           | Container image comes with the deployment task            |
| Frontend               | `pnpm dev:frontend`          | Container image comes with the deployment task            |
| Worker                 | not yet created              | Requires the job/queue implementation (ADR-008, TECH-011) |
| Scheduler              | not yet created              | Requires the scheduling implementation (ADR-008)          |
| File storage (MinIO)   | not yet available            | See open decision below                                   |

The compose file in the repository root runs only third-party dependencies. On-premise
and pilot deployments run the same codebase as separate containers (Web, Worker,
Scheduler) per ADR-001, section 10.

## Open decision — MinIO container images

TECH-008 approves MinIO as the MVP file storage provider. However, MinIO stopped
publishing free container images in October 2025 and the public repository has since
been archived, so there is currently **no supported `minio/minio` image to pin** for
local development or deployment.

Until that is resolved:

- No `minio` service is defined in `docker-compose.yml`, to avoid a dependency nobody
  can pull.
- `MINIO_*` keys are reserved in `.env.example` so the storage adapter can be wired
  without touching configuration layout later.
- File/Document work is out of scope for FND-001 and no storage adapter exists yet.

A technology decision note (or an update to TECH-008) is required before the Files
module is implemented. The decision must cover: which S3-compatible image is used for
local development, which provider is used for production/pilot, and how the storage
abstraction stays provider-agnostic per TECH-008.

## Adding infrastructure

When adding shared infrastructure:

1. Wrap it behind a port/contract owned by the consuming module (ADR-002, section 15).
2. Keep configuration in Infrastructure, never in Domain (ADR-002, section 21).
3. Add the service to `docker-compose.yml` with a healthcheck and pinned image tag.
4. Document environment variables in `.env.example`.
5. Record a decision if the choice deviates from the approved technology decisions.
