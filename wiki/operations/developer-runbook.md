# Developer and Production Runbook

## Local setup

1. Install Node.js LTS, pnpm, PostgreSQL, and Redis.
2. From `backend/`, run `pnpm install`.
3. Copy `.env.example` to `.env`; set database URL, Redis URL, JWT keys, and
   application port. Never commit `.env`.
4. Run migrations and seed only against a local database.
5. Run `pnpm test`, `pnpm build`, then `pnpm start:dev`.

## Implementation order

Identity/tenant context → catalog/contacts → inventory layers → sales and
purchases → payments/expenses → reports/dashboard → audit and background jobs.
Each module follows presentation → application → domain → infrastructure.

## Release checklist

- CI passes lint, unit, integration, API, and e2e tests.
- OpenAPI validation passes and generated client examples are current.
- Migration is backward-compatible, backup exists, and restore test passed.
- Health/readiness checks pass; logs contain request and tenant correlation.
- No secrets, tokens, or personal payment data appear in logs.

## Recovery

Set MVP targets before production: RPO ≤ 24h and RTO ≤ 4h. Restore backups to
an isolated environment, verify tenant counts and financial reconciliation,
then document the incident and recovery timestamp. Never roll back by deleting
or rewriting financial rows.

