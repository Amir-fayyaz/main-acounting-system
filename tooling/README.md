# Tooling

Repository-level tooling assets: shared configuration, quality gates and scripts used
by CI and by local development.

## Current state (FND-001)

Shared configuration currently lives at the repository root so that both apps and any
future package resolve it without extra wiring:

| File                                   | Purpose                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `tsconfig.base.json`                   | Strict TypeScript baseline extended by `apps/backend` and `apps/frontend` |
| `eslint.config.mjs`                    | Flat ESLint config for the whole workspace                                |
| `.prettierrc.json` / `.prettierignore` | Formatting rules                                                          |
| `.editorconfig`                        | Editor-level consistency                                                  |

## Quality gates (FND-005)

The baseline checks required before review/merge are orchestrated by one script
and executed by CI through the same command:

| Asset                        | Purpose                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| root `package.json` `verify` | `pnpm verify` — the single local entry point for the baseline verification                                         |
| `tooling/scripts/verify.mjs` | Runs the checks in order, stops at the first failure, reports check/scope/reproduce                                |
| `tooling/scripts/dev.mjs`    | `pnpm run dev:local` — local dev bootstrap (helpers in `tooling/scripts/dev/`, unit tests on the Node test runner) |
| `.github/workflows/ci.yml`   | Runs `pnpm verify` after `pnpm install --frozen-lockfile`; no check is re-implemented                              |

Required checks, in order: **Typecheck → Lint → Format check → Tests → Build**.
Every check also stays runnable on its own (`pnpm typecheck`, `pnpm lint`,
`pnpm format:check`, `pnpm test`, `pnpm build`); the script only orchestrates those
commands, so no quality rule is defined twice.

Deliberate choices:

- **No coverage threshold.** `05-testing-strategy.md` states that tests are not
  written for a coverage number, so `test:cov` stays informational.
- **No service containers are needed.** The HTTP tests override the readiness
  probes and the frontend tests mock `fetch`, so the gates run without MySQL,
  Redis or MinIO — locally and in CI alike.
- **Still out of scope (FND-005):** deployment, dependency/security scanning and
  release gates, per `09-ci-cd-and-development-workflow.md`.

## Pre-commit hooks (FND-014)

Cheap, local feedback on the files a commit actually changes. The hooks are a
convenience; CI stays the authority (`09-ci-cd-and-development-workflow.md`).

| Asset                                      | Purpose                                                                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `.husky/pre-commit`                        | Runs `lint-staged`, then the staged secret scan                                                                            |
| `.husky/commit-msg`                        | Runs `commitlint` on the message file git passes as `$1`                                                                   |
| `.husky/pre-push`                          | Runs `pnpm verify` — the same gate CI runs, once per push                                                                  |
| `lint-staged.config.mjs`                   | Which staged files get `eslint --fix` / `prettier --write`                                                                 |
| `commitlint.config.mjs`                    | The accepted commit types and header rules, mirroring `CONTRIBUTING.md`                                                    |
| `tooling/scripts/check-staged-secrets.mjs` | Refuses a staged private key, AWS key id, inline-password connection string or `.env` file; never prints the matched value |
| root `package.json` `prepare`              | `husky` — a fresh `pnpm install` installs the hooks                                                                        |

Every dev dependency behind these hooks is pinned to an exact version, because a
tool that decides whether a commit is refused must not change behavior on its own.

Deliberate choices:

- **The secret scan is a Node script, not a shell pipeline.** It reads the staged
  blob (`git show :path`) rather than the working tree, so it checks what will
  really be committed, and it behaves identically on Windows, macOS and Linux.
- **The credential variable names are not duplicated.** The scan parses
  `SECRET_ENVIRONMENT_KEYS` out of
  `apps/backend/src/infrastructure/config/secrets.ts`, the single declaration of
  which variables carry credentials; a unit test fails if that parse stops
  finding the real list.
- **Placeholders are not secrets.** `changeme`, `${MYSQL_PASSWORD}` and
  `your-password` do not block a commit, so `.env.example` and the documentation
  stay committable and contributors are not trained to bypass the hook.
- **`pnpm verify` is not on the commit path.** It runs per push; a broken commit
  is cheap to fix locally, a broken push is not.
- **The escape hatch is documented, not prevented.** `--no-verify` and `HUSKY=0`
  work, and `CONTRIBUTING.md` requires disclosing any use in the pull request.

`pnpm test:tooling` (also part of `pnpm test`, and therefore of `pnpm verify`)
runs the tooling suite, including real-git integration tests that stage a
secret, run the hook and assert the commit was refused with no value printed.

## Direction

`tooling/` hosts anything that must run across the workspace rather than inside one
app, for example:

- architecture enforcement (module-boundary checks for ADR-001/ADR-002),
- CI helper scripts,
- shared build/test configuration that outgrows the root files.

Anything added here must stay free of business logic and must not become a hidden
gateway between modules. `tooling/scripts/dev/` keeps the `dev:local` helpers as
pure, dependency-free modules (Node built-ins only) so they stay unit-testable
without Docker and add no runtime dependency.

## Pinned versions and the module system

These choices are deliberate and should be changed only with the same care as a
technology decision:

- **TypeScript 5.9.** TypeScript 7 (the native compiler) is not yet supported by
  `typescript-eslint` (`<6.1.0`) or by the tooling around the NestJS generator plugins.
- **ESLint 9.** `eslint-config-next` and the plugins it pulls in do not declare support
  for ESLint 10 yet.
- **Backend is ESM.** NestJS 12 packages are ESM-only (`"type": "module"`), so
  `apps/backend` is an ESM package compiled with `nodenext` and its relative imports
  include the `.js` extension. It cannot be switched back to CommonJS without
  downgrading NestJS.
- **Two test runners.** `apps/backend` uses Vitest (native ESM, SWC for decorator
  metadata); `apps/frontend` uses Jest through `next/jest`, which is the path Next.js
  supports for the App Router. Both are wired into `pnpm test`.
- **pnpm peer rules.** `package.json` allows TypeScript 5.x for `@nestjs/schematics`
  (it asks for a newer major than the rest of the toolchain supports). This rule exists
  only for that peer gap and must not be widened silently.
