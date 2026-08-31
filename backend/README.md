# Accounting SaaS Backend

NestJS modular monolith for the MVP. The code follows Clean Architecture and
Hexagonal boundaries so selected workers can be extracted to Go later.

## Run

```bash
npm install
npm run start:dev
```

## Structure

Each business module is organized as `domain`, `application`,
`infrastructure`, and `presentation`. Domain code must not import NestJS,
Prisma, HTTP, or provider SDKs. Controllers call application use cases; they
do not call repositories directly.

See `../wiki/architecture/evolutionary-architecture.md` and
`../wiki/architecture/technical-decisions-mvp.md` for the architectural
decisions.
# Backend

The backend is a NestJS modular monolith following the boundaries described in
`../wiki/architecture/application-architecture.md`.

## Start locally

Use `../wiki/operations/developer-runbook.md` for the complete setup.

```bash
pnpm install
pnpm test
pnpm build
pnpm start:dev
```

Implementation order: identity/tenants, catalog/contacts, inventory, sales and
purchases, payments, then reports. Every command resolves tenant context on
the server; financial and inventory mutations are idempotent.
