# 28 — Monorepo Handbook

- **Status:** Accepted (پذیرفته‌شده)
- **Version:** v1
- **Audience:** Every engineer working in this repository
- **Related documents:** `27-monorepo-architecture.md` (the ADR / configuration baseline), `01-engineering-principles.md`, `03-project-structure.md`

> Welcome! This handbook explains **how our monorepo works** and **why it is set up the way it is**. You do not need to memorise everything — use it as a reference when you add a dependency, create a package, or debug a build. If you only remember three things, remember these: **do not hardcode versions**, **declare a dependency where you import it**, and **run only the app you are working on**.

---

## 1. Introduction to Monorepos

### 1.1. What is a monorepo?

A **monorepo** ("mono" = single, "repo" = repository) is a single Git repository that holds **multiple projects** — in our case, three Next.js web applications, one NestJS backend, and a shared UI library. All of them live side by side under one root and are managed by one package manager (**pnpm**) with one lockfile.

Think of it as one large toolbox: instead of keeping each tool in a separate shed (separate repositories, separate installs, separate versions), everything is on one workbench where the tools can share parts.

### 1.2. Why did we choose a monorepo for this project?

| Benefit | What it means for us |
| --- | --- |
| **Shared code** | UI components, hooks, and utilities live once in `@repo/web`. The frontend, admin, and business apps import the same `Button`, `DataTable`, and `PanelLayout` — fix a bug once, and all three apps get the fix. |
| **Unified tooling** | One ESLint config, one Prettier config, one TypeScript baseline, one test command, one CI pipeline. There is no "which repo has the right lint rules?" problem. |
| **Atomic commits** | A change to a shared component and all three apps that use it can be committed **together**. No coordinated multi-repo releases, no version-mismatch surprises. |
| **Consistent versions** | With pnpm catalogs, React, Next.js, and every other shared dependency are at exactly one version across the whole workspace. |

### 1.3. What are the trade-offs?

Monorepos are powerful, but they are not free:

- **Dependency management is harder.** You must decide *which* package owns each dependency. Put it in the wrong place and you get `MODULE_NOT_FOUND` (we will cover the exact rule in §3.4).
- **Build times and memory can grow.** A naive `pnpm dev` at the root starts **every** project in parallel. With three Next.js apps and a backend, that is a lot of RAM. We manage this with filtered commands (§4.4).
- **Tooling must understand the workspace.** Next.js needs to know where the workspace root is, or it searches too widely and wastes memory (§4.3).

The good news: every one of these trade-offs has a concrete mitigation in this repository. That is what the rest of this handbook is about.

---

## 2. Our Monorepo Anatomy

Here is the shape of the workspace:

```text
main-acounting-system/
├── apps/
│   ├── frontend/          # Next.js — marketing + main panel   (port 3001)
│   ├── web-admin/         # Next.js — admin panel              (port 3002)
│   ├── web-business/      # Next.js — business panel           (port 3003)
│   └── backend/           # NestJS  — REST API, jobs, workers
├── packages/
│   └── web/               # @repo/web — shared UI library
├── tooling/
│   └── scripts/           # workspace-wide scripts (verify, dev, obs)
├── pnpm-workspace.yaml    # workspace definition + dependency catalog
├── pnpm-lock.yaml         # the ONE lockfile
└── package.json           # root scripts + shared dev tooling
```

### 2.1. `apps/` — the deployable applications

Each folder under `apps/` is a **separate deployable application**. They can be built and run independently:

| App | Package name | Purpose | Dev port |
| --- | --- | --- | --- |
| `apps/frontend` | `frontend` | Public site, auth, and the main accounting panel | 3001 |
| `apps/web-admin` | `web-admin` | Administration panel | 3002 |
| `apps/web-business` | `web-business` | Business operations panel | 3003 |
| `apps/backend` | `@accounting-saas/backend` | NestJS modular monolith: API, workers, scheduler | 3000 |

**Key idea:** apps own their own routes, features, and — importantly — any dependency their source code imports directly.

### 2.2. `packages/` — the shared libraries

`packages/web` is published internally as **`@repo/web`**. It contains the things all apps reuse:

- shadcn UI components (`button`, `dialog`, `select`, `table`, …)
- the custom `DataTable` with filtering, sorting, pagination, and Jalali date support
- shared hooks (`usePagination`, `useIsMobile`)
- shared styles (`styles/globals.css`) and panel navigation helpers

Because it is a source-level workspace package, the apps import it directly with paths such as `@repo/web`, `@repo/web/ui`, or `@repo/web/styles/globals.css`.

### 2.3. `tooling/` — shared configuration and scripts

`tooling/` holds things that apply to the **whole workspace**, not to one app: the `verify` quality-gate orchestrator, the local dev bootstrap, observability helpers, and staged-secret checks. Shared config files (ESLint, Prettier, EditorConfig) live at the root so both apps and packages resolve them without extra wiring.

**Rule of thumb:** if it must run across the workspace, it belongs in `tooling/` or the root; if it contains business logic, it does **not** belong here.

### 2.4. The `workspace:*` protocol

Apps depend on the shared library using pnpm's **`workspace:*`** protocol:

```json
// apps/frontend/package.json
{
  "dependencies": {
    "@repo/web": "workspace:*"
  }
}
```

`workspace:*` means *"link me to the local package in this workspace, whatever its version"*. pnpm creates a symlink from `apps/frontend/node_modules/@repo/web` to `packages/web`. There is no download, no registry lookup, and no publishing step — edit a component in `packages/web` and the app sees it immediately (Next.js is configured with `transpilePackages` in the admin/business apps).

This is one of the reasons monorepos feel fast: **shared code is a link, not a package release.**

---

## 3. The Magic of pnpm Catalogs

### 3.1. The problem: version drift

Imagine three apps that each declare Vitest:

```json
// before — version drift
"vitest": "^5.0.0"    // frontend
"vitest": "^5.0.2"    // web-admin
"vitest": "^5.0.0"    // web-business
```

They look compatible, but pnpm may resolve them to different builds with different peer-dependency suffixes. The result: **multiple copies of the same tool in `node_modules/.pnpm`**, slower installs, and subtle "works in one app, fails in another" bugs. Worse, upgrading React or Next.js meant editing several files and hoping nobody missed one.

### 3.2. The solution: `pnpm-workspace.yaml` + `catalog:`

A **catalog** is a named list of versions in the root `pnpm-workspace.yaml`. Each package then references a version by name with the **`catalog:`** protocol:

```yaml
# pnpm-workspace.yaml
catalog:
  next: '16.3.8'
  react: '19.2.4'
  zod: '^4.4.3'
```

```json
// any package.json in the workspace
{
  "dependencies": {
    "next": "catalog:",
    "react": "catalog:",
    "zod": "catalog:"
  }
}
```

At install time pnpm replaces `catalog:` with the version from the catalog. **One definition, one resolved version, everywhere.** The catalog is grouped by purpose (framework, UI primitives, styling, linting, testing, Storybook), so the whole platform baseline is visible in one file.

### 3.3. Step-by-step: adding a new dependency

Adding a dependency is a three-step ritual. Never skip step 1.

1. **Add the version to the catalog.** Open the root `pnpm-workspace.yaml` and add the package under the right section:

   ```yaml
   catalog:
     # --- Forms / validation / state ---
     date-fns: '^4.1.0'
   ```

2. **Reference it in the package that needs it.** Use `catalog:` instead of a version string:

   ```json
   {
     "dependencies": {
       "date-fns": "catalog:"
     }
   }
   ```

3. **Regenerate the lockfile:**

   ```bash
   pnpm install
   ```

That's it. To upgrade later, change **one** line in the catalog and run `pnpm install` again.

### 3.4. Dependency placement rules (crucial)

This is the part that trips people up, so read it twice.

pnpm uses an **isolated `node_modules`** by default. That means a package can resolve **only the dependencies it declares itself**. If `lucide-react` is declared *only* in `packages/web`, then `apps/frontend` cannot import it — Node looks in `apps/frontend/node_modules` (and its parents), does not find it, and throws `MODULE_NOT_FOUND`.

So where does a dependency go? It depends on **who imports it by name**.

| Rule | Dependency type | Where it goes | Examples |
| --- | --- | --- | --- |
| **Rule 1** | Primitive UI libraries used only inside shared components | **`packages/web`** | `@radix-ui/*`, `radix-ui`, `@tanstack/react-table`, `@tanstack/react-virtual`, `@dnd-kit/*`, `clsx`, `tailwind-merge`, `class-variance-authority`, `input-otp`, `swiper`, `tw-animate-css` |
| **Rule 2** | Packages **directly imported by app code** | **The app's `package.json`** (and also `packages/web` if the library imports them) | `lucide-react`, `sonner`, `nextjs-toploader`, `react-hook-form`, `react-icons`, `zod`, `zustand` |
| **Rule 3** | Shared development tooling | **Root `package.json`** | `eslint`, `typescript`, `vitest`, `storybook`, `@testing-library/*`, `jsdom`, `tailwindcss` |
| **Rule 4** | React / Next peers of the shared library | **`packages/web` `peerDependencies`** | `next`, `react`, `react-dom`, `react-icons` |

**Why Rule 2 exists:** app source really does import these packages:

```ts
import { toast } from 'sonner';                    // feature hooks
import NextTopLoader from 'nextjs-toploader';      // every layout.tsx
import { Plus } from 'lucide-react';               // feature components
```

Move them to `packages/web` only, and those imports break. Keeping the declaration in both places is **intentional**: pnpm resolves the same catalog version to a single store entry, so there is no real duplication of files — only of the declaration, which buys correctness.

`packages/web` declares `react`, `react-dom`, and `next` as **peer dependencies** so that all apps share one React instance instead of each bundling their own.

---

## 4. Next.js & Turbopack in a Monorepo

### 4.1. What is the "workspace root"?

The **workspace root** is the directory containing `pnpm-workspace.yaml` — in our case the repository root. Next.js tries to *infer* it by walking upward looking for lockfiles and workspace files.

In a monorepo this inference can go wrong. We previously had stray `pnpm-workspace.yaml` files inside each app, so Next.js found **two roots** and warned:

```text
Warning: Next.js inferred your workspace root, but it may not be correct.
Detected additional lockfiles:
   * apps/frontend/pnpm-workspace.yaml
```

A wrong root is not just noisy: Turbopack then watches and resolves from a wider area than necessary, which costs memory and CPU on every dev session.

### 4.2. Why `next.config.mjs` instead of `next.config.ts`?

All three apps now use `next.config.mjs`. The reason is subtle but important:

- Next.js 16 transpiles `next.config.ts` to **CommonJS**.
- Our apps are ES modules (`"type": "module"` in `package.json`).
- When the config contained runtime `import` statements, the CJS-transpiled file failed with:

  ```text
  ReferenceError: exports is not defined in ES module scope
  ```

- `.mjs` is loaded through Node's **native ESM importer**, where `import.meta.url` and `fileURLToPath` work as expected.

So we use the `.mjs` extension and plain JavaScript for the config. The actual Next.js options were preserved exactly.

### 4.3. The `turbopack.root` configuration

Each app config explicitly pins the root:

```js
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  turbopack: {
    root: path.resolve(__dirname, '../../'),
  },
  // ...existing options
};

export default nextConfig;
```

`path.resolve(__dirname, '../../')` produces the canonical absolute path of the monorepo root from any of the three app directories. Two things follow:

1. **The warnings disappear** because setting `turbopack.root` bypasses Next.js's auto-detection completely.
2. **File-watching and module resolution are scoped correctly**, reducing idle memory in `next dev`.

> **Watch out:** use `path.resolve`, not string concatenation. A value like `process.cwd() + '/../..'` is *not* normalised and still triggers a Turbopack error, because it does not exactly match the inferred root.

### 4.4. Managing the `next dev` memory footprint

Running the root `dev` script starts **all workspace packages in parallel**:

```bash
pnpm dev   # equivalent to: pnpm -r --parallel dev
```

That is convenient for demos but is the highest-memory option. When you are working on one app, use a **filter**:

```bash
pnpm --filter frontend dev       # only the main app  → port 3001
pnpm --filter web-admin dev      # only the admin app → port 3002
pnpm --filter web-business dev   # only business app  → port 3003
pnpm --filter @accounting-saas/backend dev
```

The same pattern works for `build`, `test`, and `lint`. With Next.js 16.3.8, Turbopack's **FileSystem cache** is on by default, so restarting a single app is fast — you can stop and start freely without paying a full recompile each time.

---

## 5. Step-by-Step: Building a Monorepo from Scratch (Blueprint)

Want to understand the setup by rebuilding a small version of it? Here is the blueprint we followed.

1. **Initialize the root `package.json` and `pnpm-workspace.yaml`.**

   ```bash
   mkdir my-monorepo && cd my-monorepo
   pnpm init
   ```

   ```yaml
   # pnpm-workspace.yaml
   packages:
     - apps/*
     - packages/*

   catalog:
     react: '19.2.4'
     next: '16.3.8'
   ```

   Keep the root private (`"private": true`) and put shared tooling in its `devDependencies`.

2. **Create the `apps/` and `packages/` directories.**

   ```bash
   mkdir -p apps/web apps/backend packages/ui
   ```

3. **Create a shared package (for example `@repo/ui`).**

   ```json
   // packages/ui/package.json
   {
     "name": "@repo/ui",
     "version": "0.0.0",
     "private": true,
     "exports": {
       ".": "./index.ts"
     },
     "peerDependencies": {
       "react": "catalog:"
     }
   }
   ```

   Put a simple `index.ts` in it. React is a **peer** so the app supplies the single shared instance.

4. **Link the shared package to an app with `workspace:*`.**

   ```json
   // apps/web/package.json
   {
     "name": "web",
     "scripts": { "dev": "next dev" },
     "dependencies": {
       "@repo/ui": "workspace:*",
       "next": "catalog:",
       "react": "catalog:"
     }
   }
   ```

   Run `pnpm install` and confirm `apps/web/node_modules/@repo/ui` is a symlink. If the app uses Next.js, add `"transpilePackages": ["@repo/ui"]` to its config.

5. **Configure TypeScript and ESLint at the root level.**

   Keep a `tsconfig.base.json` and a flat `eslint.config.mjs` at the root; have each app extend/import them. Then add one `verify` script that runs typecheck → lint → format → test → build, so local development and CI execute exactly the same gates.

   Finish by setting `turbopack.root` in every Next.js config (see §4.3) and adding a `pnpm --filter <app> dev` command for each app.

---

## 6. Troubleshooting & Best Practices

### 6.1. "Module not found"

**Symptom:** `Cannot find module 'sonner'` (or another package) from an app file.

**What to do:**

1. Check whether the package is imported **by name in the app's source**. If yes, it **must** be declared in that app's `package.json`.
2. Do not "fix" it by only adding it to `packages/web` — pnpm's isolated linker will not expose it to the app.
3. Add the version to the catalog if needed, add `"catalog:"` to the app manifest, and run `pnpm install`.

### 6.2. "Next.js inferred your workspace root"

**Symptom:** build prints `Next.js inferred your workspace root, but it may not be correct` and `Detected additional lockfiles`.

**What to do:**

1. Confirm there is **only one** `pnpm-workspace.yaml` and **only one** `pnpm-lock.yaml` in the repository (run the `find` command below).
2. Confirm each app config sets `turbopack.root` with `path.resolve(__dirname, '../../')`.
3. Make sure the path is normalised — never `process.cwd() + '/../..'`.

```bash
find . \( -name pnpm-workspace.yaml -o -name pnpm-lock.yaml \) \
  -not -path "*/node_modules/*" -not -path "./.git/*"
```

Expected output: `./pnpm-workspace.yaml` and `./pnpm-lock.yaml` — nothing else.

### 6.3. Memory issues

**Symptom:** `next dev` or the machine runs out of RAM.

**What to do:** run only one app with a filter instead of the whole workspace:

```bash
pnpm --filter frontend dev
```

Close dev servers you are not using, and rely on Turbopack's disk cache to make restarts cheap. Avoid running `pnpm dev` (all packages) unless you specifically need every app at once.

### 6.4. Best practices checklist

- ✅ **Never hardcode versions** — always use `catalog:` for shared dependencies.
- ✅ **Keep the root lockfile as the single source of truth** — never commit a lockfile inside `apps/` or `packages/`.
- ✅ **Declare a dependency where you import it** — apps for app imports, `packages/web` for shared-component internals, root for global tooling.
- ✅ **Use `workspace:*`** for internal packages instead of version ranges.
- ✅ **Set `turbopack.root`** in every Next.js app config.
- ✅ **Use `pnpm --filter`** for day-to-day development to save RAM.
- ✅ **Run `pnpm verify`** before opening a pull request — it executes the same gates as CI.

You are now equipped to work in the monorepo confidently. When in doubt, come back to this handbook, or read `27-monorepo-architecture.md` for the reasoning behind each decision. Happy building!
