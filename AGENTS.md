# AGENTS.md - Enterprise Accounting Monorepo Guidelines

## 1. Project Overview & Architecture

- **Structure:** Monorepo managed with `pnpm` workspaces (Root root-level control only; do not create separate lockfiles inside apps).
- **Backend (`apps/backend`):** NestJS, Domain-Driven Design (DDD) & Hexagonal Architecture. Divided strictly into four layers per module: `domain`, `application`, `infrastructure`, and `presentation`.
- **Frontend (`apps/frontend`):** Next.js App Router, Route Groups `(auth)`, `(marketing)`, `(panel)`, with component features strictly housed in `src/core/features/` and UI in `src/core/components/`.
- **Database & Migration:** Drizzle ORM with PostgreSQL. Migrations managed strictly via `drizzle-kit generate` (never edit metadata/migrations manually).

---

## 2. Essential Commands & Workflows

Always execute workspace commands from the root using pnpm filters:

- **Install:** `pnpm install`
- **Docker Infra:** `docker compose up -d`
- **Backend Dev:** `pnpm --filter backend dev`
- **Frontend Dev:** `pnpm --filter frontend dev`
- **Lint & TypeCheck:** `pnpm lint`
- **Run Tests:** `pnpm test`

---

## 3. Backend Coding Standards & Domain Rules (NestJS)

### Strict Layer Independence & Module Boundaries

- **Framework Independence:** The `domain` and `shared` layers must remain 100% pure TypeScript with zero framework coupling (no NestJS decorators or Drizzle dependencies in domain).
- **Module Isolation:** Modules must communicate through `public-api.ts` or explicit ports/adapters. Adhere to dependency rules verified by `module-boundaries.spec.ts` and `framework-independence.spec.ts`.

### Domain Logic & Error Handling (Result Pattern)

- **No Exceptions in Domain/App:** Throwing standard exceptions in `domain` and `application` use-cases is **strictly prohibited**. Always use the `Result` and `DomainError` monad pattern (`shared/errors/result.ts`).
- **Error Mapping:** Convert domain errors to HTTP exceptions exclusively in the `presentation` / `infrastructure` exception filters and mappers (`api-error.registry.ts`).

### Multi-Tenancy & Security Guardrails

- **Tenant Isolation:** Every repository, query, and use-case dealing with tenant data must strictly enforce `TenantScope` / `tenantId`. Never execute cross-tenant or un-scoped queries.
- **Guards & Decorators:** All new backend endpoints (except public auth routes) must enforce `AuthenticationGuard` and `AuthorizationGuard`. Use `@CurrentPrincipal` and `@TenantRoute` instead of raw request objects.

### Financial Primitives & Concurrency

- **Strict Primitives:** Never use primitive `number` for money or standard JS `Date` for business dates. Use the project's built-in `Money`, `Decimal`, `BusinessDate`, and `JalaliCalendar` (`shared/`).
- **Optimistic Concurrency:** Core aggregates (especially financial modules like `accounting`, `treasury`, `inventory`) must use `Revision` (`optimistic-concurrency.ts`) to throw `StaleRevision` errors on collision.

### Outbox Pattern & Background Jobs

- **Transactional Outbox:** State changes producing Domain Events must run inside a `TransactionBoundary` (`drizzle-transaction-runner.ts`) and be recorded to the Outbox table within the same transaction.
- **Independent Processes (`src/processes`):** Heavy operations, event publishing, workers, and schedulers must remain decoupled from HTTP controllers and run via `worker` or `scheduler` entrypoints.
- **Redis Jobs & Idempotency:** New background jobs must be registered in `job.registry.ts`, use `job-keys.ts`, apply `RetryPolicy`, and utilize `redis-idempotency.guard.ts`.

### Storage & Config Management

- **Object Storage Port:** File/document uploads must exclusively use `ObjectStoragePort` backed by MinIO (tenant-prefixed keys). Local `fs` or direct SDK usage is banned.
- **Environment & Config:** Direct use of `process.env` is forbidden. All configurations must pass through `AppConfigService` (`configuration.ts`).

---

## 4. Frontend Coding Standards (Next.js & Tailwind)

### Feature-Driven Architecture & Routing

- **Feature Isolation:** Feature logic, hooks, services, and components for panel sections (`accounting`, `checks`, `inventory`, etc.) must live inside `src/core/features/<module-name>/`.
- **Thin Pages:** Files inside `src/app/(panel)/panel/...` should act as thin route wrappers rendering feature components.
- **Naming Convention:** Use `block/` and `ui/` inside feature components (preserve legacy `blook/` paths without breaking imports).

### UI/UX, RTL & Financial Styling

- **RTL & Persian Standards:** The panel is strictly Persian/RTL. Use logical Tailwind properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`).
- **Design System:** Follow the design taste rules (`design-taste-frontend` & `ui-ux-pro-max` skills). Use design tokens and CSS variables in `globals.css` / `panel.css` rather than hardcoding raw colors.
- **Formatting:** Format financial figures with standard thousand separators, Persian digits in presentation, and Jalali calendar components while submitting standard DTO payloads to the API.

---

## 5. Agent Operational Process & Guardrails

### Mandatory Task Lifecycle (Spec-Driven & TDD)

1. **Clarification First:** If a business rule or accounting formula is ambiguous, **ask the user** before writing code rather than guessing.
2. **Context Inspection:** Read relevant module code, domain models, and `shared/` definitions first.
3. **Implementation + Testing:** Implement code following DDD/Clean Architecture boundaries and write targeted unit tests (`.spec.ts`) using Test Doubles from `test/support/`.
4. **Verification:** Run linters, type checks, and related unit tests before marking the task complete.

### Strict Git & Environment Guardrails

- **No Destructive Git:** Never execute destructive git commands (`git push --force`, `git reset --hard`, `git clean -fd`) or commit without explicit permission (`git-guardrails-claude-code`).
- **No Package Manager Rogue Actions:** Do not install unauthorized packages or alter root/app workspaces without explicit direction.
