# 27 — Monorepo Architecture: Configuration Baseline & ADR

- **Status:** Accepted (پذیرفته‌شده)
- **Version:** v1
- **Date:** 2026-11-20
- **Author:** Omid / Team
- **Category:** Engineering — Build & Tooling
- **Scope:** `apps/frontend`, `apps/web-admin`, `apps/web-business`, `apps/backend`, `packages/web`, root workspace
- **Related documents:** `01-engineering-principles.md`, `03-project-structure.md`, `09-ci-cd-and-development-workflow.md`, `12-development-conventions.md`
- **Companion guide:** `28-monorepo-handbook.md` (educational walkthrough)

> This document is both an **Architecture Decision Record (ADR)** — it records why the workspace was changed — and the **Configuration Baseline** for the monorepo toolchain. For step-by-step instructions and concepts, see the companion handbook.

---

## 1. Context (Why this decision was needed)

Before this refactoring, the monorepo had four recurring problems that compounded each other. **Memory pressure during `next dev`** was the most visible symptom: three Next.js applications were being developed in parallel, each resolving and retaining its own copy of a large dependency graph. Because the apps declared overlapping versions of the same packages (Vitest `^5.0.0`, `eslint-config-next` `16.2.1` vs `^16.3.6`, `react-icons` `^5.4.0` vs `^5.7.0`), pnpm could not share a single resolution for many packages, so duplicate module graphs were held in memory. At the same time, heavyweight development tooling — Storybook, Vitest, Testing Library, jsdom, TypeScript, ESLint, and Tailwind — was declared independently in every application manifest, multiplying install time, symlink count, and lockfile size.

The second problem was **incorrect workspace-root detection**. Stray `pnpm-workspace.yaml` files inside `apps/frontend`, `apps/web-admin`, and `apps/web-business` (leftovers from an earlier non-monorepo setup) caused Next.js to believe there were multiple workspace roots. Every build emitted `Next.js inferred your workspace root, but it may not be correct` and `Detected additional lockfiles`. These files also caused Turbopack to compute wider file-watching and module-resolution scopes than necessary, adding avoidable work to every dev session. Stale per-app `pnpm-lock.yaml` files made the situation worse and violated the monorepo rule that the root must be the only lockfile authority.

---

## 2. Decision (What was changed)

The solution was delivered in four coordinated changes.

### 2.1. Dependency Centralization with pnpm Catalogs

`pnpm-workspace.yaml` is now the **single source of truth** for all shared dependency versions. Previously, a version bump required editing three or four `package.json` files; a missed file produced silent version drift and duplicate entries in the pnpm store. The catalog groups versions by concern — framework/runtime, UI primitives, styling, linting, testing, Storybook — so a maintainer can see the entire platform baseline in one place.

All hardcoded version strings were removed from the application manifests. Each shared dependency now uses the `catalog:` protocol:

```yaml
# pnpm-workspace.yaml
catalog:
  next: '16.3.8'
  react: '19.2.4'
  zod: '^4.4.3'
  '@radix-ui/react-slot': '^1.2.4'
```

```json
// apps/frontend/package.json
{
  "dependencies": {
    "next": "catalog:",
    "react": "catalog:",
    "zod": "catalog:"
  }
}
```

Because the catalog is evaluated by pnpm at install time, the resolved versions are identical across every workspace package. This eliminates the peer-dependency suffix duplication that previously produced multiple `vitest@…` and `@storybook/nextjs-vite@…` entries in `node_modules/.pnpm`. A version change is now a one-line edit in the catalog followed by `pnpm install`.

### 2.2. Dependency Placement Strategy (Apps vs. `packages/web`)

A central goal was to move UI dependencies out of the apps and into `packages/web`. **This was done selectively, based on where each package is actually imported.** This distinction is the key architectural decision of the refactoring.

pnpm's default `node-linker=isolated` creates `node_modules` links **only for packages a workspace package declares itself**. A dependency declared solely in `packages/web` is *not* resolvable from `apps/frontend` source code. Moving every UI dependency to the library would therefore break the build the moment an app imports one directly.

Source analysis produced two groups:

| Group | Packages | Placement | Reason |
| --- | --- | --- | --- |
| **Primitive UI internals** | `@radix-ui/*`, `radix-ui`, `@tanstack/react-table`, `@tanstack/react-virtual`, `@dnd-kit/*`, `clsx`, `tailwind-merge`, `class-variance-authority`, `input-otp`, `swiper`, `tw-animate-css` | **Moved to `packages/web`** | Imported only by shared components (e.g. `ui/components/shadcn/...`, the DataTable). The apps consume them transitively through `@repo/web` and never import them by name. |
| **Directly imported UI packages** | `lucide-react`, `sonner`, `nextjs-toploader`, `react-hook-form`, `react-icons`, `zod`, `zustand` | **Kept in the apps** (and, where the library imports them, also in `packages/web` peers/deps) | App source imports them by name — e.g. `import { toast } from 'sonner'` in feature hooks, `import NextTopLoader from 'nextjs-toploader'` in every `layout.tsx`, and `import { Plus } from 'lucide-react'` throughout feature components. Removing them from the app would cause `MODULE_NOT_FOUND` under pnpm's isolated linker. |

`packages/web` keeps `next`, `react`, `react-dom`, and `react-icons` as **peer dependencies** so a single React instance is shared with the hosting app. Heavy development tooling was moved to the **root** `package.json` (Storybook, Vitest, Testing Library, jsdom, ESLint, TypeScript, `@types/*`, Tailwind); pnpm exposes root binaries to workspace scripts, so `pnpm --filter frontend test` still resolves `vitest` correctly while only one physical copy exists.

### 2.3. Workspace Root & Turbopack Configuration

Three stray `pnpm-workspace.yaml` files and three stale per-app `pnpm-lock.yaml` files were **deleted**. Only the root `pnpm-workspace.yaml` and root `pnpm-lock.yaml` remain. Before deletion, Next.js's `findRootDirAndLockFiles()` discovered two roots for every app and printed the workspace-inference and additional-lockfile warnings on every build. After deletion, that function reports exactly one root for all three apps.

All three app configs were converted from `next.config.ts` to **`next.config.mjs`** and given an explicit Turbopack root:

```js
// apps/frontend/next.config.mjs, apps/web-admin/next.config.mjs,
// apps/web-business/next.config.mjs
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  turbopack: {
    root: path.resolve(__dirname, '../../'),
  },
  // ...existing options preserved
};

export default nextConfig;
```

**Why `.mjs` instead of keeping `.ts`:** Next.js 16 transpiles `next.config.ts` to CommonJS. Adding runtime `import` statements to a `.ts` config inside a `"type": "module"` package produced `ReferenceError: exports is not defined in ES module scope`. `.mjs` is loaded through Node's native ESM importer, where `import.meta.url` and `fileURLToPath` work correctly. `path.resolve(__dirname, '../../')` yields the canonical absolute monorepo root, which also satisfies Turbopack's root-matching requirement — a non-normalized path such as `process.cwd() + '/../..'` still triggers a build error.

Setting `turbopack.root` explicitly **bypasses Next.js workspace auto-detection entirely**, permanently silencing the warnings and preventing Turbopack from computing an unnecessarily wide module-resolution and file-watching scope. This directly reduces idle memory in `next dev`.

### 2.4. Performance Optimization (Next.js Upgrade)

Next.js was upgraded from **16.2.5 to 16.3.8** in the catalog (`next: '16.3.8'`). Version 16.3 introduced two relevant Turbopack improvements:

- **FileSystem caching for builds is now enabled by default** (`experimental.turbopackFileSystemCacheForBuild`, v16.3.0), complementing the dev cache enabled in v16.1. Turbopack persists compilation snapshots under `.next/cache/turbopack` and restores them on the next run, so subsequent builds and dev sessions start warm instead of recompiling the entire graph.
- **Turbopack memory eviction** (`experimental.turbopackMemoryEviction`, v16.3.0) is available with a default of `'auto'`. Once a cache snapshot is written to disk, Turbopack can evict in-memory copies and reload them on demand, using OS memory-pressure feedback to decide when eviction is worthwhile. This is the mechanism behind the **up-to-90% reduction in development memory** reported for large projects — it is an upstream figure, not a benchmark measured in this repository. Eviction only takes effect in `next dev` when FileSystem caching is enabled, which is the default in 16.3.8.

The 16.3.8 patch release also includes security fixes accumulated since 16.2.5; staying on the current patch keeps the workspace on the supported, patched line. No `experimental` flags were added — the improvements are active with the default configuration.

---

## 3. Consequences

### Positive

- One edit changes a shared version everywhere; drift is no longer possible.
- Per-app `node_modules` symlink counts dropped roughly 75%; three redundant lockfiles were removed.
- Workspace-root and lockfile warnings are gone from every build.
- Turbopack watches and resolves from the correct root, reducing idle dev memory.
- Next.js 16.3.8 brings default-on disk caching, memory eviction, and security patches.

### Negative / Accepted trade-offs

- `packages/web` and the apps both declare some UI packages (e.g. `lucide-react`, `sonner`). This is **intentional duplication of declarations**, not of installed files — pnpm resolves the same catalog version to one store entry.
- `next.config.mjs` files lose TypeScript type checking of the config object; the trade-off was required for correct ESM resolution of `import.meta.url`.
- The root `pnpm` field warning and ESLint v10 migration remain open (see §6).

---

## 4. Verification & Validation

The following commands were run from the repository root after the refactoring and the 16.3.8 upgrade:

```bash
pnpm install      # ✓ exit 0 — "Already up to date", single root lockfile
pnpm typecheck    # ✓ exit 0 — tsc --noEmit -p tsconfig.json
pnpm lint         # ✓ exit 0 — 2 pre-existing warnings, 0 errors
pnpm build        # ✓ exit 0 — all four workspace packages built
```

Build result:

```text
apps/backend build: Done
apps/web-admin build: Done
apps/frontend build: Done
apps/web-business build: Done
```

A full scan of the complete build log for `workspace root`, `lockfile`, `Detected additional`, `inferred`, and Turbopack error markers returned **zero matches** — no workspace-root or lockfile warnings remain. Direct inspection of `findRootDirAndLockFiles()` confirmed a single root (`/home/omid/_code/team/main-acounting-system`) for each app, and the on-disk check confirmed only one `pnpm-workspace.yaml` and one `pnpm-lock.yaml` exist.

Test suites passed during the refactoring validation cycle: frontend (302 tests), web-admin (24), web-business (390), `@repo/web` (22), and backend (1,720 passed / 134 skipped). The 16.3.8 patch changes Next.js runtime and tooling only, not test logic.

---

## 5. Configuration Baseline (Reference)

### Adding a new dependency

Never hardcode a version in a package manifest. Add the version to the catalog once, then reference it everywhere:

```yaml
# 1. pnpm-workspace.yaml — add under the appropriate catalog section
catalog:
  date-fns: '^4.1.0'
```

```json
// 2. any package.json
{
  "dependencies": {
    "date-fns": "catalog:"
  }
}
```

```bash
# 3. regenerate the lockfile
pnpm install
```

If a package is imported by application source, it **must** remain declared in that app — moving it to `packages/web` alone will break resolution under pnpm's isolated linker. If it is only used inside shared components, declare it in `packages/web`.

### Running only one app to save RAM

The root `dev` script runs every workspace package in parallel and is the highest-memory option. Prefer filtered commands when working on a single application:

```bash
pnpm --filter frontend dev       # port 3001
pnpm --filter web-admin dev      # port 3002
pnpm --filter web-business dev   # port 3003
pnpm --filter @accounting-saas/backend dev
```

The same pattern applies to `build`, `test`, and `lint`. Turbopack's FileSystem cache in 16.3.8 means restarts are warm, so stopping and restarting a single app is cheap.

### Unused dependencies

`zustand` and `use-debounce` are declared in all three apps and remain in the catalog, but a source search found **no imports** of either in application code (`packages/web` implements its own `useDebouncedCallback`). They are retained for now to avoid unrelated churn. **Recommendation:** remove both from the apps and the catalog in a focused cleanup commit after confirming no planned store or debounce work depends on them.

---

## 6. Known Issues / Future Work

- **`pnpm.peerDependencyRules` warning.** pnpm 12 no longer reads the `pnpm` field from `package.json`; every install prints `[WARN] The "pnpm" field in package.json is no longer read by pnpm ... "pnpm.peerDependencyRules"`. The block still lives in the root `package.json`. It should be moved to the top-level `peerDependencyRules` key in `pnpm-workspace.yaml` and the `pnpm` field removed. This was intentionally left out of scope to avoid changing dependency/catalog configuration during the root-detection work.

- **ESLint v10 upgrade path.** The catalog currently pins `eslint: '^9.39.5'` with `eslint-config-next: '^16.3.6'` and `typescript-eslint: '^8.71.0'`. npm now marks ESLint 9.39.5 deprecated in favor of 10.x, and `pnpm peers check` reports a pre-existing unmet peer for `@nestjs/schematics@12.0.6` (which wants TypeScript 6). Upgrading requires coordinated bumps of ESLint, `eslint-config-next`, `typescript-eslint`, and the flat config, followed by a full `pnpm lint` pass. This is tracked as a follow-up to the current stable configuration.

- **Documentation drift.** A few documents (for example `docs/frontend/FrontEnd-Structure.md`) still refer to `next.config.ts`; the files are now `next.config.mjs`. These references should be updated in a docs-only pass.
