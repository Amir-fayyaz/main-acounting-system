# Frontend Structure

Complete reference for how the frontend of the Accounting SaaS ("Taraz") monorepo is organized: apps, shared package, folder conventions, data flow, tooling and how to add new code.

> Source of truth for this document is the repository code. Items marked **(unverified)** were read from code/config but not executed (dependencies could not be installed while writing this).

---

## Table of contents

1. [Overview](#1-overview)
2. [Monorepo layout](#2-monorepo-layout)
3. [Runtime topology](#3-runtime-topology)
4. [Tech stack](#4-tech-stack)
5. [App internals](#5-app-internals)
6. [Features](#6-features)
7. [Shared package `@repo/web`](#7-shared-package-repoweb)
8. [Styling and design tokens](#8-styling-and-design-tokens)
9. [Authentication and data flow](#9-authentication-and-data-flow)
10. [Configuration and environment](#10-configuration-and-environment)
11. [Testing and Storybook](#11-testing-and-storybook)
12. [Commands](#12-commands)
13. [Conventions](#13-conventions)
14. [How to add a feature](#14-how-to-add-a-feature)
15. [Known issues and gotchas](#15-known-issues-and-gotchas)

---

## 1. Overview

The frontend consists of **three Next.js applications** and **one shared UI package**, all in a pnpm workspace together with the NestJS backend.

| Workspace      | Path                | Port | Purpose                                                              | State         |
| -------------- | ------------------- | ---- | -------------------------------------------------------------------- | ------------- |
| `frontend`     | `apps/frontend`     | 3001 | Marketing site, auth pages, panel preview, gateway to the other apps | Most complete |
| `web-admin`    | `apps/web-admin`    | 3002 | Platform admin panel (served under `/admin`)                         | Skeleton      |
| `web-business` | `apps/web-business` | 3003 | Tenant/business panel (served under `/business`)                     | Skeleton      |
| `@repo/web`    | `packages/web`      | n/a  | Shared UI components, hooks, styles, fonts                           | In use        |
| `backend`      | `apps/backend`      | 3000 | REST API, prefix `/api`, versioned `/api/v1`                         | Separate      |

Product facts that shape the UI: Persian language, RTL layout, desktop-first, Iranian Rial (IRR). The backend is the owner of all business rules; the frontend never re-implements accounting logic (see `docs/product/v1/11-engineering/02-technology-decisions/TECH-004-frontend.md`).

---

## 2. Monorepo layout

```text
.
├── apps/
│   ├── backend/            NestJS + Drizzle (not covered here)
│   ├── frontend/           Next.js, port 3001
│   ├── web-admin/          Next.js, port 3002
│   └── web-business/       Next.js, port 3003
├── packages/
│   └── web/                @repo/web, shared UI package
├── docs/
│   ├── product/v1/         Domain, architecture, engineering docs
│   ├── frontend/           Frontend docs (this file lives here)
│   └── testing/
├── tooling/scripts/        dev.mjs, verify.mjs
├── pnpm-workspace.yaml     packages: apps/*, packages/*
└── package.json            Root scripts
```

Workspace globs are `apps/*` and `packages/*`. Frontend apps depend on the shared package with `"@repo/web": "workspace:*"`.

---

## 3. Runtime topology

The three apps are composed into **one origin** using Next.js rewrites defined in `apps/frontend/next.config.ts`:

```text
Browser ──► frontend :3001
              │
              ├── /                 → served by frontend
              ├── /admin/*          → rewrite → web-admin    :3002/*
              ├── /admin-static/*   → rewrite → web-admin    :3002/admin-static/*
              ├── /business/*       → rewrite → web-business :3003/*
              ├── /business-static/*→ rewrite → web-business :3003/business-static/*
              └── API calls         → backend :3000/api/v1/*
```

Key consequences:

- `web-admin` and `web-business` set `assetPrefix` (`/admin-static`, `/business-static`) so their JS/CSS load through the gateway.
- Because everything is served from the same origin, the auth cookie (`Token`) is shared by all three apps.
- Neither admin nor business app sets a `basePath`. Their routes live at `/` inside the app and the gateway strips the prefix, so **internal links inside those apps must account for the `/admin` or `/business` prefix** (decide on `basePath` vs. prefixed links before building navigation).
- The rewrite destinations are hardcoded to `localhost`. They need environment-based values for Docker and production **(see [Known issues](#15-known-issues-and-gotchas))**.

---

## 4. Tech stack

| Area               | Choice                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| Framework          | Next.js 16 (App Router), React 19, TypeScript 5                                                         |
| Styling            | Tailwind CSS 4 (`@tailwindcss/postcss`), `tw-animate-css`, CSS variables                                |
| UI primitives      | shadcn/ui on Radix UI (`radix-ui`, `@radix-ui/*`), `class-variance-authority`, `clsx`, `tailwind-merge` |
| Icons              | `lucide-react`, `react-icons` (panel sidebar uses `react-icons/ci`)                                     |
| Forms / validation | `zod` 4 (custom form hooks; no form library dependency)                                                 |
| State              | `zustand` (client state; see `core/store`)                                                              |
| Toasts / loader    | `sonner`, `nextjs-toploader`                                                                            |
| Carousel           | `swiper`                                                                                                |
| Fonts              | `next/font/local`: Rubik (Latin), Vazirmatn (Persian, frontend only)                                    |
| Tests              | Vitest 5, Testing Library, jsdom                                                                        |
| Component workshop | Storybook 10 (`@storybook/nextjs-vite`) with a11y, docs, vitest addons                                  |
| Lint / format      | ESLint 9 (`eslint-config-next`, typescript-eslint), Prettier                                            |

---

## 5. App internals

### 5.1 `apps/frontend`

```text
apps/frontend/
├── .storybook/                   Storybook config
├── public/                       Static assets
├── src/
│   ├── proxy.ts                  Route protection (Next.js 16 proxy, formerly middleware)
│   ├── app/                      Routing only
│   │   ├── layout.tsx            Root layout (fonts, Toaster, SiteHeader/SiteFooter)
│   │   ├── globals.css           Tailwind + tokens (duplicates the shared one)
│   │   ├── page.tsx              Landing home
│   │   ├── (marketing)/          about, contact, demo, faq, pricing
│   │   ├── (auth)/               login, register, forgot  (+ layout.tsx)
│   │   └── (panel)/              panel preview
│   │       ├── layout.tsx        Wraps children in AccountingPanelLayout
│   │       ├── panel.css         Panel-scoped styles, hides site header/footer
│   │       └── panel/            page.tsx + one placeholder page per module
│   │                             (accounting, audit-trail, checks, documents, inventory,
│   │                              payments, people, purchases, reconciliation, reports,
│   │                              sales, settings, store/{orders,discounts,returns})
│   └── core/
│       ├── components/           Global components only (see 5.4)
│       ├── features/             auth, landing, panel, example
│       ├── hooks/                useTimer, useScrollPosition, useUpdataQuery
│       ├── lib/                  basic-link (env, BASE_URL), coockie, revalidate, token, zod
│       ├── store/                zustand stores
│       ├── utils/                Shared pure helpers
│       ├── assets/               @types, mock, style/fonts
│       └── test/                 setup.ts and shared test helpers
├── components.json               shadcn config
├── next.config.ts                Rewrites to admin/business
├── vitest.config.ts
└── tsconfig.json
```

### 5.2 `apps/web-admin` and `apps/web-business`

Identical skeletons (only port and `assetPrefix` differ):

```text
src/
├── app/
│   ├── layout.tsx          Imports @repo/web/styles/globals.css, Rubik font, Toaster, loader
│   ├── page.tsx            Placeholder (renders a Button)
│   └── ui-preview/page.tsx Visual check of shared UI
└── core/                   Copy of frontend core: hooks, lib, utils, @types, fonts,
                            plus empty features/example scaffold
```

They are intended to receive real features (see `docs/frontend/05-roadmap.md`). Unlike `frontend`, they import design tokens from the shared package.

### 5.3 Routing rules (`src/app`)

- `app/` contains **routing only**: `page.tsx`, `layout.tsx`, `metadata`. Pages are thin and render one block from a feature.
- Route groups (parentheses) separate concerns without changing URLs: `(marketing)`, `(auth)`, `(panel)`.

```tsx
// app/(marketing)/about/page.tsx
export default function AboutRoute() {
  return (
    <SectionLayout>
      <AboutPage /> {/* from core/features/landing/components/block/about */}
    </SectionLayout>
  );
}
```

- **Route protection** is in `src/proxy.ts`: public paths are listed in `PUBLIC_PATHS`; guest-only paths (`/login`, `/register`) redirect authenticated users to `/`; everything else redirects to `/login` when there is no usable token. The matcher skips `api`, `_next/static`, `_next/image`, `favicon.ico`, `common` and any path containing a dot. The proxy only checks that a cookie exists; the backend is the real authority.

### 5.4 `core/components`

```text
core/components/
├── shadcn/ui/        shadcn primitives local to the app (mostly empty; primitives live in @repo/web)
└── custom/
    ├── ui/           Global, domain-free components (e.g. logo/Logo.tsx)
    └── blook/        Legacy: header, footer, contact, about, faq (see below)
```

Rule: a component is **global** only if it has no page-specific content and is used by more than one feature. Anything specific to a page or domain belongs in `core/features/<name>`.

> `blook/{contact,about,faq}` are currently unused duplicates of `features/landing` and are scheduled for removal (see `docs/frontend/issues/001-design-tokens-and-blook-cleanup.md`).

---

## 6. Features

A **feature** is a self-contained vertical slice in `core/features/<name>`. It owns its components, types, data, hooks, API calls, utils and tests. Features must not import from each other's internals; shared things move up to `core/hooks|lib|utils` or `@repo/web`.

### 6.1 Anatomy

```text
core/features/<name>/
├── components/
│   ├── ui/        Small presentational pieces (props in, JSX out)
│   └── block/     Sections and full-page compositions made of ui pieces
├── assets/
│   ├── @types/    TypeScript types for this feature
│   └── mock/      Static content and mock data
├── hook/          React hooks
├── lib/           API calls, zod schemas, storage/server actions
├── utils/         Pure functions
└── test/          Tests
```

Only create the folders you need.

### 6.2 Existing features

| Feature   | Contents                                                                                                                                                                                                                                                                                           |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`    | **Reference feature.** Login/Register/Forgot forms, `AuthShell`, field and button components, hooks (`useSignIn`, `useSignUp`, `useSignOut`, `useSession`, `useAuthForm`), `auth-api`, `auth-schemas`, `auth-storage` (server actions), `mapAuthError`, 9 test files, stories                      |
| `landing` | Marketing site: header/footer, home sections (hero, capabilities, scope, outcomes, companies), about, contact, faq, pricing, demo, shared CTA/workflow/intelligence/dashboard blocks. Content lives in `assets/mock/*`, types in `assets/@types/*`, contact validation and pricing logic in `lib/` |
| `panel`   | Accounting panel preview: `AccountingPanelLayout` (wraps the shared `PanelLayout`), navigation config in `assets/mock/navigation.ts`, its own Vitest config and test                                                                                                                               |
| `example` | Empty scaffold showing the expected folder shape                                                                                                                                                                                                                                                   |

### 6.3 Panel feature

`apps/frontend/src/core/features/panel` wires the shared panel to a navigation config:

- `assets/mock/navigation.ts` exports `accountingPanelConfig` (panel type, title, brand, home route, navigation groups, serializable icon names such as `CiGrid41`).
- `components/block/layout/AccountingPanelLayout.tsx` renders `PanelLayout` from `@repo/web/ui/panel`.
- All `/panel/*` pages are static placeholders; there is no backend integration yet. Full usage guide: `docs/frontend/reusable-panel.md`.

---

## 7. Shared package `@repo/web`

Path: `packages/web`. Consumed by all three apps; Next must transpile it (`transpilePackages: ['@repo/web']` in admin/business).

```text
packages/web/
├── assets/            @types (Typography), mock, style
├── hooks/             useIsMobile
├── styles/
│   ├── globals.css    Tailwind + design tokens (target single source of truth)
│   └── fonts/
└── ui/
    ├── index.ts       Barrel: shadcn primitives + core custom components
    ├── panel.ts       Barrel for @repo/web/ui/panel
    ├── sidebar.ts     Barrel for @repo/web/ui/sidebar
    ├── utils/cn.ts    className merge helper
    └── components/
        ├── shadcn/ui/   badge, button, card, dialog, dropdown-menu, input, input-otp,
        │                pagination, popover, progress, select, separator, sheet, sidebar,
        │                skeleton, sonner, switch, table, tabs, Textarea, tooltip
        └── custom/
            ├── ui/      image (ImgNormalCustom), modal, search-input, sidebar,
            │            typography, wrapper (PagesContainer, SectionLayout)
            └── panel/   PanelLayout and its blocks (header, layout, sidebar),
                         ui (account, search, sidebar-toggle), hook, utils
```

### Public entry points

Defined in `packages/web/package.json` → `exports`:

| Import                         | Provides                                                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `@repo/web/ui`                 | shadcn primitives, Typography (`H1`, `P`, `Span`, ...), `Modal`, `SectionLayout`, `PagesContainer`, `ImgNormalCustom` |
| `@repo/web/ui/panel`           | `PanelLayout`, `PanelConfiguration` and related types                                                                 |
| `@repo/web/ui/sidebar`         | `AppSidebar` and navigation types                                                                                     |
| `@repo/web/ui/utils/cn`        | `cn()`                                                                                                                |
| `@repo/web/hooks/useIsMobile`  | `useIsMobile()`                                                                                                       |
| `@repo/web/styles/globals.css` | Tailwind and tokens                                                                                                   |
| `@repo/web/styles/fonts/font`  | Shared font setup                                                                                                     |

Adding a new component to the package means: create it, export it from the right barrel (`ui/index.ts`), and if needed add an `exports` entry. These two files are conflict hot spots; change them in small dedicated PRs.

### Tailwind scanning

Tailwind must scan the shared package. The frontend panel stylesheet adds an `@source` pointing to `packages/web/ui`; any app consuming shared components must do the same or import the shared `globals.css`.

---

## 8. Styling and design tokens

- Tokens are CSS variables in `:root` and `.dark`, mapped to Tailwind via `@theme inline` (`--color-background`, `--color-primary`, ...).
- Dark mode uses the `.dark` class (`@custom-variant dark (&:is(.dark *))`).
- Brand tokens: `brand`, `brand-dark`, `brand-soft`, `brand-link`, `ink`, `ink-soft`, `sand`, `sand-soft`.
- Fonts are exposed as `--font-rubik` and `--font-vazirmatn` (frontend); the base sans font is `--font-rubik`.
- Radius scale derives from `--radius` (0.75rem).

**Rule:** no hardcoded colors in TSX (`#hex`, `bg-[#...]`, `bg-white`, etc.). Use tokens; add a new token to `globals.css` (light and dark) when one is missing. Details and the replacement table: `docs/frontend/03-design-system.md`.

Current debt: `apps/frontend/src/app/globals.css` duplicates the shared `globals.css`, and most of `features/landing` still uses hardcoded colors.

---

## 9. Authentication and data flow

### 9.1 Backend contract (summary)

- `POST /api/v1/auth/sign-up`, `POST /api/v1/auth/sign-in`, `GET /api/v1/auth/session`, `POST /api/v1/auth/sign-out`.
- Sign-in returns `{ token, tokenType: "Bearer", expiresAt, principal }`. The token is an opaque session token, not a JWT.
- Errors use one envelope: `{ error: { code, category, message, correlationId, details[] } }`.
- Full API notes: `docs/frontend/04-api-integration.md`.

### 9.2 Sign-in flow in the frontend

```text
LoginForm (client)
  └─ useSignIn()
       ├─ signInApi()            auth-api.ts   → POST /api/v1/auth/sign-in
       ├─ setAuthToken()         auth-storage.ts ('use server' action)
       │                         → writes httpOnly cookie "Token" (maxAge from expiresAt,
       │                           or 30 days with "remember", or AUTH_SESSION_TTL_MINUTES)
       ├─ toast + router.push('/') + router.refresh()
       └─ errors → mapAuthError() → Persian message
```

- The cookie is **httpOnly**, so client code cannot read it. Session info is fetched through the server action `getSessionAction()`, which reads the cookie on the server and calls `GET /auth/session`.
- `signOutAction()` calls the backend (when a token exists) and always clears the cookie.
- `proxy.ts` reads the same cookie for redirects.

### 9.3 Base URL resolution

`auth-api.ts` picks the API base: in the browser `NEXT_PUBLIC_API_BASE_URL`, on the server `INTERNAL_API_BASE_URL` (e.g. `http://backend:3000/api` in Docker) falling back to the public one; `NEXT_PUBLIC_BACK_URL` is a legacy fallback. Requests go to `${base}/v1/...`.

### 9.4 Server state

There is no data-fetching library yet. Existing code uses `fetch` plus local hooks. Before building the admin/business features the team should standardize on one API client and a query layer (proposal in `docs/frontend/04-api-integration.md`).

---

## 10. Configuration and environment

| Variable                   | Where            | Meaning                                           |
| -------------------------- | ---------------- | ------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | browser + server | Public API base, e.g. `http://localhost:3000/api` |
| `INTERNAL_API_BASE_URL`    | server only      | API base reachable from inside Docker             |
| `NEXT_PUBLIC_BACK_URL`     | legacy           | Fallback for the public base                      |
| `AUTH_SESSION_TTL_MINUTES` | server           | Cookie lifetime fallback (default 60)             |

Defined centrally in the root `.env.example`; `apps/frontend/src/core/lib/basic-link/env.ts` exposes them as getters.

### Path aliases (`apps/frontend/tsconfig.json`)

| Alias            | Maps to                             |
| ---------------- | ----------------------------------- |
| `@/*`            | `./src/*`                           |
| `@/core/*`       | `./src/core/*`                      |
| `@/components/*` | `./src/core/components/*`           |
| `@/shadcn/*`     | `./src/core/components/shadcn/ui/*` |

Prefer `@/core/...` for app code and `@repo/web/...` for shared code.

### shadcn

Each app has a `components.json`. Generate shadcn primitives into `packages/web` (shared), not into an individual app, unless the component is app-specific.

---

## 11. Testing and Storybook

### Vitest

- Environment: jsdom. Setup file: `src/core/test/setup.ts`. `NEXT_PUBLIC_API_BASE_URL` is set to `http://localhost:3000/api` in `vitest.config.ts`.
- Tests live in the feature's `test/` folder (e.g. `features/auth/test/*`) or next to the file for utils (`formatDate.test.ts`).
- The `panel` feature has its own config: `features/panel/test/vitest.panel.config.ts`.
- Current frontend count: 16 test files.
- What to test: hooks, schemas, utils, API mappers, form behavior, route protection. Do not test styling.

### Storybook

- Config: `apps/frontend/.storybook`, framework `@storybook/nextjs-vite`, addons: a11y, docs, vitest, chromatic, onboarding.
- Stories are co-located with components (`*.stories.tsx`); 39 exist today (mostly `auth` and the legacy `blook` folders). The glob is `../../**/*.stories.*` relative to `.storybook`, i.e. it scans everything under `apps/`.
- Rule: every new reusable UI component gets a story with light and dark states.

---

## 12. Commands

Run from the repository root (pnpm 10+, Node 22+).

| Command                             | Does                                         |
| ----------------------------------- | -------------------------------------------- |
| `pnpm install`                      | Install all workspaces                       |
| `pnpm dev`                          | Run all workspace `dev` scripts in parallel  |
| `pnpm --filter frontend dev`        | Frontend on :3001                            |
| `pnpm --filter web-admin dev`       | Admin on :3002                               |
| `pnpm --filter web-business dev`    | Business on :3003                            |
| `pnpm build` / `pnpm typecheck`     | Build / type-check all                       |
| `pnpm lint` / `pnpm lint:fix`       | ESLint                                       |
| `pnpm format` / `pnpm format:check` | Prettier                                     |
| `pnpm test`                         | Run all tests                                |
| `pnpm --filter frontend test`       | Frontend tests only                          |
| `pnpm storybook`                    | Storybook (script targets `@repo/storybook`) |

Package names are `frontend`, `web-admin`, `web-business`. Some root scripts use the filter `@accounting-saas/frontend`; see the next section.

---

## 13. Conventions

- **One feature, one owner, one folder.** Do not edit another feature's files in a feature PR.
- **Thin routes.** `app/**/page.tsx` renders one block; no logic.
- **Server Components by default.** Add `'use client'` only for state, effects and browser events.
- **No business logic.** Accounting rules, totals and permission decisions come from the backend.
- **Tokens only** for color. Every new token needs light and dark values.
- **Naming (target):** kebab-case folders, PascalCase component files, `useXxx` hooks, `xxx.types.ts` types, stories next to components. Existing code is mixed; follow this for new code.
- **Persian UI text**; error messages come from the backend `error.code` mapped to Persian in one place.
- **Money** is always a string (`{ amount: "125000.00", currency: "IRR" }`), never a JS number.
- **Optimistic concurrency:** send `expectedRevision` on every update and handle `409` by reloading.
- **Every feature** ships with: types, loading/empty/error states, tests for logic, stories for UI.

Definition of done and team workflow: `docs/frontend/06-team-workflow.md`.

---

## 14. How to add a feature

Example: a "roles" feature in `web-business`.

1. **Contract first.** Add types in `core/features/roles/assets/@types/role.types.ts` matching the OpenAPI schemas (`RoleResponseDto`, pagination meta, error envelope).
2. **API layer.** `lib/roles-api.ts` with typed functions (`listRoles`, `createRole`, ...). Use the shared API client once it exists; until then follow `auth-api.ts`.
3. **Schemas.** `lib/role-schemas.ts` with zod for forms.
4. **Hooks.** `hook/useRoles.ts`, `hook/useCreateRole.ts`; map errors to field errors and Persian messages.
5. **UI pieces.** `components/ui/RoleStatusBadge.tsx`, `RoleForm.tsx` (props in, JSX out, tokens only).
6. **Blocks.** `components/block/RolesPage.tsx` composes the table, filters and dialogs; handle loading, empty, error and 403.
7. **Route.** `app/roles/page.tsx` renders `<RolesPage />`.
8. **Navigation.** Add one item to the panel navigation config (hot file; keep that change small).
9. **Tests and stories.** `test/` for hooks and schemas, `*.stories.tsx` for UI.
10. **Verify.** `pnpm typecheck && pnpm lint && pnpm test`, then check RTL, mobile and dark mode manually.

If you need something shared (a new shadcn primitive, a table, a token), put it in `@repo/web` in a separate small PR first.

---

## 15. Known issues and gotchas

Each item is also tracked in `docs/frontend/01-project-overview.md`.

| #   | Issue                                                                                                                                              | Impact                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | `proxy.ts` public paths include `/plans` and `/customers` but the real pages are `/pricing` and `/demo` **(unverified at runtime)**                | Guests may be redirected to `/login` from those pages           |
| 2   | Hardcoded colors across `features/landing` and `LedgerPanel`                                                                                       | Inconsistent theming, broken dark mode in places                |
| 3   | Tokens are defined twice (`frontend/globals.css` and `packages/web/styles/globals.css`); `brand-link` exists only in the frontend copy             | Admin/business lack that token                                  |
| 4   | `core/components/custom/blook/{contact,about,faq}` is dead code duplicating `features/landing`                                                     | Confusion, extra Storybook noise                                |
| 5   | `core/` code (hooks, lib, utils, fonts) is copied into all three apps                                                                              | Fixes must be applied three times                               |
| 6   | Rewrites to admin/business are hardcoded to `localhost`                                                                                            | Won't work in Docker/production without env-based URLs          |
| 7   | No `basePath` for admin/business behind the `/admin` and `/business` rewrites                                                                      | Internal links/redirects need explicit handling                 |
| 8   | Each app has its own `pnpm-workspace.yaml` and `pnpm-lock.yaml` next to the root workspace **(unverified)**                                        | Lockfile conflicts, unexpected installs                         |
| 9   | Root scripts and `docker-compose.yml` filter by `@accounting-saas/frontend`, but the package is named `frontend` **(unverified)**                  | `pnpm dev:frontend` / compose command may not match the package |
| 10  | Root `layout.tsx` still has the default `Create Next App` metadata; admin/business also apply `rubik.variable` twice and hardcode the loader color | Wrong titles, minor cleanup                                     |
| 11  | No forgot/reset-password endpoint in the API                                                                                                       | `/forgot` cannot be wired to a real backend yet                 |
| 12  | The panel pages under `/panel/*` are placeholders                                                                                                  | No accounting UI until the backend exposes those endpoints      |

---

## Related documents

- `docs/frontend/README.md`: index of frontend docs
- `docs/frontend/01-project-overview.md`: project review and findings
- `docs/frontend/02-architecture-and-conventions.md`: folder rules
- `docs/frontend/03-design-system.md`: tokens and color replacement table
- `docs/frontend/04-api-integration.md`: API contract and open questions
- `docs/frontend/05-roadmap.md`: roadmap and task assignment
- `docs/frontend/06-team-workflow.md`: workflow and conflict avoidance
- `docs/frontend/reusable-panel.md`: `PanelLayout` guide
