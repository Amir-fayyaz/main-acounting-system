# Contributing to Accounting SaaS

Thank you for your interest in contributing! 🎉

This project is in **active MVP development** and not production-ready yet.
Because of that, the architecture and conventions are still being shaped — so
every contribution matters, and clarity in communication matters even more.

By participating in this project, you agree to abide by our
[Code of Conduct](CODE_OF_CONDUCT.md).

---

## 📑 Table of Contents

- [Ways to contribute](#-ways-to-contribute)
- [Before you start](#-before-you-start)
- [Reporting bugs](#-reporting-bugs)
- [Suggesting features](#-suggesting-features)
- [Development workflow](#-development-workflow)
  - [Branch & commit conventions](#-branch--commit-conventions)
  - [Local setup](#-local-setup)
  - [Architecture rules (the hard ones)](#-architecture-rules-the-hard-ones)
  - [Module structure](#-module-structure)
  - [Coding style](#-coding-style)
  - [Testing requirements](#-testing-requirements)
  - [Documentation policy](#-documentation-policy)
- [Pull request process](#-pull-request-process)
- [Release notes](#-release-notes)
- [License](#-license)

---

## 🧩 Ways to contribute

You don't need to write code to help:

- 🐛 **Filing bug reports** with reproducible steps
- 💡 **Proposing features** with clear use cases
- 📖 **Improving docs** in [`wiki/`](wiki/) — this is the most impactful
  contribution right now
- 🌍 **Translating** UI strings (once the i18n catalog lands)
- 🧪 **Writing tests** — see the [mandatory scenarios](wiki/quality/mvp-testing-strategy.md)
- 🔍 **Reviewing PRs** and leaving constructive feedback

---

## 🛑 Before you start

> **Open an issue before sending a PR.**
>
> The architecture is still evolving, and we want to align with you on
> direction *before* significant work starts. For typos, small docs fixes,
> or trivial bug fixes, you can skip this and open the PR directly.

Use **GitHub Discussions** for open-ended questions, **Issues** for concrete
proposals or bug reports.

---

## 🐛 Reporting bugs

Open a GitHub issue and include:

1. **What happened** — actual behavior
2. **What you expected** — expected behavior
3. **Steps to reproduce** — minimal reproducible example, ideally a failing
   test or a `curl`/HTTP trace
4. **Environment** — Node version, pnpm version, PostgreSQL version, OS
5. **Logs / screenshots** — but **strip any secrets or real tenant data**
   before attaching

If the bug is a **security issue**, follow [SECURITY.md](SECURITY.md) instead —
**do not** file it publicly.

---

## 💡 Suggesting features

Open a GitHub issue (or a Discussion if it's still forming) and describe:

1. **The user problem** you're solving — who is the user, what are they trying
   to do, what's blocking them today?
2. **The proposed solution** — at a high level
3. **Alternatives considered** — and why this approach wins
4. **Impact on the architecture** — does it touch multi-tenancy, idempotency,
   the domain layer, or the API contract?

Features that change the public API contract or the domain model need an
explicit design review before implementation starts.

---

## 🛠️ Development workflow

### 🌿 Branch & commit conventions

We use **Conventional Commits** for commit messages and **Trunk-Based
Development** with short-lived feature branches for the branching model.

**Branch naming:**

```
<type>/<scope>-<short-kebab-description>

# Examples
feat/sales-invoice-issuing
fix/contacts-balance-recompute
docs/wiki-multi-tenancy-typo
refactor/inventory-stock-movement-handler
test/sales-idempotency
```

Accepted types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`,
`chore`, `build`, `ci`.

**Commit messages** must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

<body — wrap at 72 chars; explain the *why*, not the *what*>

<footer — references to issues, breaking changes, etc.>
```

Examples:

```
feat(sales): add issuing of sales invoices

Invoices are now issued through a single use case that validates
stock availability and produces an InvoiceIssued domain event.
Resolves #142.
```

```
fix(inventory): prevent negative stock under concurrent sales

Wrap stock decrement in a SELECT ... FOR UPDATE within the same
transaction as the sale write. Adds a regression test.
```

Breaking changes must include a `!` after the type/scope and a
`BREAKING CHANGE:` footer describing the migration path.

---

### 🧪 Local setup

> See [`wiki/operations/developer-runbook.md`](wiki/operations/developer-runbook.md)
> for the full checklist.

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp backend/.env.example backend/.env
# edit backend/.env (DATABASE_URL, REDIS_URL, JWT secrets, ...)

# 3. Build the shared package
pnpm --filter @accounting-saas/ddd-core build

# 4. Verify everything compiles and tests pass before you start
pnpm typecheck
pnpm test
pnpm --filter accounting-saas-backend start:dev
```

Before opening a PR, all of the following must succeed locally:

```bash
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm --filter accounting-saas-backend lint
pnpm --filter accounting-saas-backend format:check
```

---

### 🏗️ Architecture rules (the hard ones)

These rules are **non-negotiable**. They exist so the codebase stays portable
across runtimes (today's NestJS, future Go workers) and so domain code stays
trivially testable.

> Full details live in
> [`wiki/architecture/module-structure-convention.md`](wiki/architecture/module-structure-convention.md).

- 🚫 **Domain code must not import** NestJS, TypeORM, Prisma, HTTP, or any
  provider SDK. If your domain file imports `@nestjs/*`, the PR is rejected.
- 🚫 **Controllers must not call repositories directly.** Controllers call
  application handlers (use cases).
- 🚫 **No circular dependencies** between bounded contexts. Cross-module
  references use IDs and ports, never direct imports.
- ✅ **Every command is tenant-scoped and idempotent.** Tenant context is
  resolved on the server from the authenticated principal — never trusted
  from the client.
- ✅ **Money is stored as a minor-unit integer (`bigint`) with a currency code.**
  Never use floats for monetary calculations.
- ✅ **Side effects go through ports.** Domain → application → port (interface)
  → adapter (infrastructure).

A PR that violates any of these will be sent back for rework, no matter how
small.

---

### 🗂️ Module structure

Each bounded context under [`backend/src/modules/`](backend/src/modules/)
follows this layout:

```
<module>/
├── domain/             # Aggregates, value objects, domain events, ports
├── application/        # Commands, queries, handlers, DTOs
├── infrastructure/     # Persistence adapters, messaging, config
└── presentation/       # HTTP controllers, HTTP DTOs, guards, pipes
```

Naming rules (excerpt — see the wiki for the full list):

- Entities: `*.entity.ts`
- Value objects: `*.value-object.ts`
- Domain events: `*.event.ts` — **named in the past tense** (`InvoiceIssued`,
  not `IssueInvoice`)
- Errors: `*.error.ts`
- Repository ports: `*.repository.ts`
- Application handlers: `*.handler.ts`
- HTTP DTOs: `*.request.dto.ts` / `*.response.dto.ts`

One primary type per file. If a type is reused, it gets its own file.

---

### 🎨 Coding style

- **TypeScript strict mode is on.** No `any`, no `@ts-ignore` without a
  justification comment.
- **Match the surrounding code's density.** Don't over-comment obvious code;
  don't under-comment non-obvious *why*.
- **Use the existing ESLint and Prettier configs.** They are authoritative —
  don't fight the formatter.
- **All user-facing strings** must eventually live in a single i18n catalog.
  For now, hard-coded English strings are accepted but should be wrapped in a
  helper so the future migration is mechanical.
- **Imports:** prefer workspace package aliases (`@accounting-saas/ddd-core`,
  `@infra/...`, `@shared/...`) over deep relative paths.
- **Naming:** all identifiers and comments are in **English**.

---

### 🧪 Testing requirements

We follow the test pyramid described in
[`wiki/quality/mvp-testing-strategy.md`](wiki/quality/mvp-testing-strategy.md).
The non-negotiable scenarios are:

- **Tenant isolation:** user A in tenant X can never see or mutate tenant Y's
  data, regardless of input.
- **Inventory:** sales never create negative stock, even under concurrent
  load.
- **Financial integrity:** confirmed documents are immutable; reversals
  produce linked compensating records; balances reconcile with transactions.
- **Authorization:** each role can do exactly what its matrix allows, and
  nothing more.

Every PR must:

- ✅ Add or update **unit tests** alongside the change
- ✅ Add an **integration or e2e test** if the change touches persistence,
  HTTP, or a cross-module flow
- ✅ Pass the existing mandatory scenarios — re-run them locally before
  pushing

A failing mandatory scenario is a release blocker.

---

### 📖 Documentation policy

- The [`wiki/`](wiki/) folder is **the source of truth** for design decisions.
- Any change that alters a public API, the domain model, multi-tenancy,
  idempotency, or the security posture **must update the relevant wiki page
  in the same PR**.
- New business concepts need a glossary entry in [`wiki/domain/`](wiki/domain/).
- OpenAPI annotations on controllers feed the live Swagger docs — keep them
  accurate; don't rely on ad-hoc README snippets for API documentation.

---

## 🔁 Pull request process

1. **Open or link an issue.** PRs without context will be asked for one.
2. **Keep PRs focused.** One concern per PR. If you find an unrelated bug
   while working, file a separate issue — don't bundle it.
3. **Fill in the PR template.** Describe the change, link the issue, list the
   tests added, and call out any wiki updates.
4. **Self-review your diff** before requesting review. Look for forgotten
   `console.log`s, commented-out code, debug breakpoints, and `.only()` in
   tests.
5. **CI must be green.** Lint, typecheck, unit, and e2e tests all run on every
   PR. A red CI blocks merge.
6. **At least one maintainer approval** is required for merge. Architectural
   changes require two.
7. **Squash-merge** is the default. The squash commit message should follow
   Conventional Commits.

### PR checklist (copy this into your PR description)

```markdown
- [ ] Linked to an issue (or described the motivation)
- [ ] Tests added or updated
- [ ] `pnpm typecheck` passes locally
- [ ] `pnpm test` and `pnpm test:e2e` pass locally
- [ ] `pnpm --filter accounting-saas-backend lint` passes
- [ ] No domain layer imports framework / ORM / HTTP / SDK code
- [ ] No controller calls a repository directly
- [ ] Wiki updated (if public API, domain, or architecture changed)
- [ ] No secrets, real tenant data, or PII in commits, logs, or screenshots
```

---

## 📝 Release notes

We do not yet publish formal release notes — the project is pre-1.0 and the
changelog lives in the git history and PR titles. A proper `CHANGELOG.md` will
land with the first tagged release.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

By submitting a contribution, you agree that your contribution will be
licensed under the same MIT License, and you affirm that you have the right
to submit the work under those terms.

---

Thank you for helping make this project better. 💛
