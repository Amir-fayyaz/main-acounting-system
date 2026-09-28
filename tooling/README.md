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

## Direction

`tooling/` hosts anything that must run across the workspace rather than inside one
app, for example:

- architecture enforcement (module-boundary checks for ADR-001/ADR-002),
- CI helper scripts,
- shared build/test configuration that outgrows the root files.

Anything added here must stay free of business logic and must not become a hidden
gateway between modules.

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
