<div align="center">

# Accounting SaaS

**A multi-tenant, accounting-ready business management platform for small businesses.**

Industry-agnostic · Simple by default · Clean / Hexagonal architecture

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status: MVP](https://img.shields.io/badge/status-MVP-orange.svg)](#-status)
[![Node: ≥22](https://img.shields.io/badge/node-%E2%89%A522-339933?logo=node.js&logoColor=white)]()
[![pnpm: ≥9](https://img.shields.io/badge/pnpm-%E2%89%A59-F69220?logo=pnpm&logoColor=white)]()
[![NestJS: 11](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)]()
[![TypeScript: 5.7](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)]()
[![PostgreSQL: 15](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql&logoColor=white)]()
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

---

## 📑 Table of Contents

- [✨ Features](#-features)
- [🏗️ Architecture](#-architecture)
- [🚀 Quick Start](#-quick-start)
- [🧰 Tech Stack](#-tech-stack)
- [🔐 Environment Variables](#-environment-variables)
- [🗄️ Database & Migrations](#-database--migrations)
- [🌐 Internationalization](#-internationalization)
- [📦 Deployment](#-deployment)
- [🧪 Testing](#-testing)
- [🗂️ Project Structure](#-project-structure)
- [📚 Documentation](#-documentation)
- [❓ FAQ](#-faq)
- [🧭 Roadmap](#-roadmap)
- [🤝 Contributing](#-contributing)
- [💬 Support](#-support)
- [🔒 Security](#-security)
- [⭐ Show your support](#-show-your-support)
- [📄 License](#-license)

---

## ✨ Features

- 🧾 **Sales & Purchases** — invoices, items, discounts, returns, payments
- 📦 **Inventory** — products, services, categories, stock levels, low-stock alerts
- 👥 **Contacts** — customers, suppliers, and per-contact balances
- 💵 **Cash & Banking** — accounts, receipts, payments, checks
- 📊 **Reporting** — sales, inventory, receivables, basic P&L
- 🏢 **Multi-Tenant** — strict tenant isolation built into every command
- 👤 **Identity & Roles** — users, stores, granular permissions
- 💳 **Subscriptions** — plan-based limits (planned)
- 🌐 **i18n-ready** — money, time, and number formatting abstracted behind value objects

---

## 🏗️ Architecture

This repository is a **pnpm monorepo** that hosts two packages:

```
.
├── backend/              # NestJS modular monolith (HTTP API)
└── packages/
    └── ddd-core/         # Framework-free DDD & hexagonal building blocks
```

### Backend

- **NestJS 11** modular monolith with strict module boundaries.
- **Clean Architecture / Hexagonal**: each business module is split into
  `domain`, `application`, `infrastructure`, and `presentation`.
- Domain code **never** imports NestJS, TypeORM, HTTP, or provider SDKs.
- Controllers call **use cases**, not repositories.
- Modules are designed so individual workers can later be extracted to Go
  without rewriting the domain.
- Every command resolves the **tenant context on the server**; financial and
  inventory mutations are **idempotent**.
- Public API is mounted under **`/api/v1`**, with interactive Swagger docs at
  **`/api/docs`** (non-production only).

Current business modules:

```
identity · tenants · contacts · catalog · inventory
sales · purchases · accounting · cash-management · reporting · subscriptions
```

### `@accounting-saas/ddd-core`

Zero-dependency shared kernel providing:

- **Domain** — `Entity`, `AggregateRoot`, `DomainEvent`, `ValueObject`,
  `Money`, `Quantity`, `DomainError` hierarchy.
- **Ports** — `Clock`, `IdGenerator`, `EventPublisher` (interfaces + injection symbols).
- **Application** — `Command`, `Query`, `UseCase`, `Result<T, E>`,
  `UnitOfWork`, `OutboxPort`.
- **Reference adapters** — `SystemClock`, `UuidIdGenerator`.

> The shared kernel has **zero runtime dependencies**, so it can be reused by
> any future service (Go worker, edge function, etc.) without dragging
> framework code into the domain.

See [`packages/ddd-core/README.md`](packages/ddd-core/README.md) for the full API.

---

## 🚀 Quick Start

### Prerequisites

| Tool       | Version |
| ---------- | ------- |
| Node.js    | ≥ 22    |
| pnpm       | ≥ 9     |
| PostgreSQL | ≥ 15    |
| Redis      | ≥ 7     |

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Configure the backend
cp backend/.env.example backend/.env
# then edit backend/.env (DATABASE_URL, REDIS_URL, JWT secrets, ...)

# 3. Build the shared package and start the API
pnpm build
pnpm --filter accounting-saas-backend start:dev
```

The API will then be available at:

- 🌐 HTTP API → `http://localhost:3000/api/v1`
- 📘 Swagger UI → `http://localhost:3000/api/docs` (non-production only)
- ❤️ Health check → `http://localhost:3000/api/v1/health`

---

## 🧰 Tech Stack

**Runtime**
- Node.js 22 · TypeScript 5.7
- NestJS 11 · Express · RxJS
- TypeORM · PostgreSQL 15 · Redis 7

**Tooling**
- pnpm workspaces
- Jest (unit + e2e) · Supertest
- ESLint (flat config) · Prettier
- Husky / lint-staged (planned)

**Architecture & Patterns**
- Domain-Driven Design (DDD)
- Hexagonal / Ports & Adapters
- CQRS-lite (Command / Query bus)
- Outbox pattern for reliable event delivery
- Result type for explicit error handling
- Unit of Work for transactional consistency

---

## 🔐 Environment Variables

The backend reads its config from environment variables (loaded via
`backend/.env` in development). **All values must be provided in production.**

| Variable             | Required | Default                                | Description                                                                |
| -------------------- | -------- | -------------------------------------- | -------------------------------------------------------------------------- |
| `NODE_ENV`           | ✅       | —                                      | `development` / `test` / `production`                                       |
| `PORT`               | ✅       | `3000`                                 | HTTP listen port                                                            |
| `DATABASE_URL`       | ✅       | —                                      | PostgreSQL connection string (e.g. `postgresql://user:pass@host:5432/db`)   |
| `REDIS_URL`          | ✅       | —                                      | Redis connection string (e.g. `redis://localhost:6379`)                     |
| `JWT_ACCESS_SECRET`  | ✅       | —                                      | HMAC secret for access tokens. **Generate with `openssl rand -base64 48`** |
| `JWT_ACCESS_TTL`     | ❌       | `15m`                                  | Access-token TTL                                                            |
| `JWT_REFRESH_TTL`    | ❌       | `30d`                                  | Refresh-token TTL                                                           |
| `CORS_ORIGINS`       | ❌       | `http://localhost:3001`                | Comma-separated allowed origins, or `*` to allow any                         |

> Generate strong secrets with: `openssl rand -base64 48`

---

## 🗄️ Database & Migrations

- **PostgreSQL** is the system of record for all tenant data.
- Schema is managed with **TypeORM**; migrations live in
  `backend/src/infrastructure/persistence/migrations/`.
- Migrations are **tenant-aware**: tenant-scoped tables carry a `tenant_id`
  column and row-level filters are enforced at the repository layer.

```bash
# Generate a migration from current entity changes (after editing entities)
pnpm --filter accounting-saas-backend migration:generate

# Apply pending migrations
pnpm --filter accounting-saas-backend migration:run

# Revert the last migration
pnpm --filter accounting-saas-backend migration:revert
```

See [`wiki/data/`](wiki/data/) for the full data-model and migration policy.

---

## 🌐 Internationalization

Although the MVP ships with English-only UI strings, the codebase is designed
for internationalization from day one:

- **Money** is stored as a minor-unit integer (`bigint`) with a currency code —
  no float math, locale-independent arithmetic.
- **Time** is handled through the `Clock` port — easy to mock and freeze in tests.
- **Tenant configuration** (locale, timezone, currency, date format) lives in
  the `tenants` bounded context so each business can use its own conventions.
- All user-facing strings must live in a single i18n catalog before the first
  production release.

If you'd like to contribute a translation, see [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## 📦 Deployment

The project does **not** ship a production deployment story yet — it is
intentionally MVP-stage. A few guiding principles already in place:

- ✅ Stateless API process (safe to scale horizontally)
- ✅ Strict config validation at bootstrap — missing env fails fast
- ✅ Graceful shutdown hooks (`app.enableShutdownHooks()`)
- ✅ Health endpoints for liveness / readiness probes
- 🚧 Docker image & Helm chart (planned)
- 🚧 CI/CD pipeline (planned)

For local Docker-only smoke tests:

```bash
docker run -d --name postgres -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=accounting_saas postgres:15
docker run -d --name redis -p 6379:6379 redis:7
pnpm install && pnpm build && pnpm --filter accounting-saas-backend start:prod
```

> ℹ️ Do **not** deploy this against real customer data yet.

---

## 🧪 Testing

```bash
# Unit tests across the workspace
pnpm test

# End-to-end tests (backend)
pnpm test:e2e

# Type-check the whole workspace
pnpm typecheck

# Lint and format
pnpm --filter accounting-saas-backend lint
pnpm --filter accounting-saas-backend format
```

Testing conventions:

- **Unit tests** live next to the code they cover (`*.spec.ts`).
- **E2E tests** live under `backend/test/`.
- Domain code is covered with pure unit tests — no NestJS test module required.
- See [`wiki/quality/`](wiki/quality/) for the full testing strategy.

---

## 🗂️ Project Structure

```
.
├── backend/                     # NestJS API
│   ├── src/
│   │   ├── modules/             # Business modules (one folder per bounded context)
│   │   │   └── <module>/
│   │   │       ├── domain/          # Aggregates, value objects, domain services
│   │   │       ├── application/     # Use cases, ports (in/out), DTOs
│   │   │       ├── infrastructure/  # Adapters: persistence, messaging, etc.
│   │   │       └── presentation/    # Controllers, HTTP DTOs
│   │   ├── infrastructure/      # Cross-cutting adapters (config, db, http, ...)
│   │   ├── shared/              # Cross-cutting concerns shared between modules
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/                    # e2e tests
│   └── .env.example
├── packages/
│   └── ddd-core/                # Shared kernel (D/Hex building blocks)
└── wiki/                        # Living product & engineering documentation
    ├── architecture/            # System design, decisions, patterns
    ├── product/                 # Product overview, scope, MVP decisions
    ├── domain/                  # Domain glossary & context maps
    ├── data/                    # Data model & migrations guidelines
    ├── api/                     # API conventions
    ├── operations/              # Runbooks, deployment
    └── quality/                 # Testing, observability, security
```

---

## 📚 Documentation

The [`wiki/`](wiki/) folder is the source of truth for design decisions and
operational guidance:

| Topic                     | Where to start                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Product vision & scope    | [`wiki/product/overview.md`](wiki/product/overview.md)                                                     |
| System context            | [`wiki/architecture/system-context.md`](wiki/architecture/system-context.md)                               |
| Application architecture  | [`wiki/architecture/application-architecture.md`](wiki/architecture/application-architecture.md)           |
| Module conventions        | [`wiki/architecture/module-structure-convention.md`](wiki/architecture/module-structure-convention.md)     |
| Multi-tenancy model       | [`wiki/architecture/multi-tenancy.md`](wiki/architecture/multi-tenancy.md)                                 |
| Security model            | [`wiki/architecture/security.md`](wiki/architecture/security.md)                                           |
| Transactional consistency | [`wiki/architecture/transactions-and-consistency.md`](wiki/architecture/transactions-and-consistency.md)   |
| MVP technical decisions   | [`wiki/architecture/technical-decisions-mvp.md`](wiki/architecture/technical-decisions-mvp.md)             |
| Shared kernel API         | [`packages/ddd-core/README.md`](packages/ddd-core/README.md)                                               |

---

## ❓ FAQ

**Q: Is this production-ready?**
A: No. It's under active MVP development. The architecture is shaped for the
future, but the surface area, security hardening, and ops story are still in
progress. **Do not** run it against real financial data.

**Q: Why NestJS and not Fastify / Express / Hono?**
A: We wanted a batteries-included container (DI, validation, OpenAPI, testing)
on top of a battle-tested HTTP framework. See
[`wiki/architecture/technical-decisions-mvp.md`](wiki/architecture/technical-decisions-mvp.md).

**Q: Why is TypeORM allowed in `infrastructure/` but banned in `domain/`?**
A: The domain must stay framework-free so it can be unit-tested in isolation
and later extracted to other runtimes (e.g. Go workers). See
[`wiki/architecture/module-structure-convention.md`](wiki/architecture/module-structure-convention.md).

**Q: Can I run a single business module without the rest?**
A: Yes, by design. Modules have minimal cross-context coupling — they
communicate via domain events and explicit ports.

**Q: Why pnpm workspaces and not npm / yarn / nx / turborepo?**
A: pnpm is fast, has first-class workspace support, and keeps the monorepo
small while we validate the architecture. We can adopt Nx or Turborepo later
without rewriting code.

**Q: How is multi-tenant data isolated?**
A: Every tenant-scoped table carries a `tenant_id` column, every command
resolves the tenant from the authenticated principal on the server (never
trusting the client), and repositories always filter by tenant. See
[`wiki/architecture/multi-tenancy.md`](wiki/architecture/multi-tenancy.md).

**Q: Where is the frontend?**
A: Not in this repository yet. The MVP focuses on a clean backend; UI is a
separate future repository.

---

## 🧭 Roadmap

Implementation order for the MVP:

1. identity · tenants
2. catalog · contacts
3. inventory
4. sales · purchases
5. payments
6. reports

Future capabilities intentionally kept behind a clean architectural seam:

- 📒 Chart of accounts, journal entries, general ledger
- 📈 Trial balance & advanced financial reports
- 💳 Subscription billing & plan enforcement
- 🌐 First-class i18n & locale-aware formatting
- 🐳 Docker images, Helm chart, CI/CD
- 🦫 Extracting modules into standalone Go workers

---

## 🤝 Contributing

Contributions are welcome. Since this is an early-stage project, the
[`wiki/`](wiki/) is the best starting point — it explains the *why* behind
the architectural seams.

A few rules of thumb:

- Domain code must stay framework-free (no NestJS, TypeORM, HTTP, SDK imports).
- Controllers call use cases; use cases call ports.
- Every mutation is tenant-scoped and idempotent.
- Public APIs and behavior changes must update the wiki.
- Add or update tests alongside every change.

> 📘 A full [`CONTRIBUTING.md`](CONTRIBUTING.md) and
> [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) will land before the first
> public release.

---

## 💬 Support

- 🐛 **Bug reports & feature requests** → GitHub Issues
- 💡 **Questions & discussions** → GitHub Discussions
- 🔐 **Security issues** → see [Security](#-security) below — **do not** file publicly

---

## 🔒 Security

This project is **not production-ready**. Please **do not** deploy it against
real financial data yet.

If you find a security issue, please **do not** open a public issue. Instead,
contact the maintainers privately (see [`SECURITY.md`](SECURITY.md) once
published) and we will respond as quickly as we can.

---

## ⭐ Show your support

If this project is useful to you, please consider:

- ⭐ **Starring** the repository
- 🐛 **Filing issues** for bugs or missing features
- 📖 **Improving the docs** in [`wiki/`](wiki/)
- 🗣️ **Spreading the word** in your community

It really helps the project grow.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE)
file for the full text.

© 2026 Accounting SaaS contributors
