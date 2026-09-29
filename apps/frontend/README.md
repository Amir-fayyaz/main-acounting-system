# Frontend — Desktop-first Web UI

Next.js (App Router) + TypeScript client for the accountant and finance manager
desktop experience (TECH-004). The backend REST API is the only source of business
truth; no accounting rule or business logic is implemented here.

No feature screen exists yet — this is the FND-001 workspace baseline.

## Layout

```text
app/          App Router routes, layout and the application shell
features/     Feature-oriented UI + client-side use cases (added with real stories)
components/   Shared UI building blocks on top of the internal design system
shared/       Frontend-agnostic primitives and helpers
lib/          Configuration, transport and framework adapters
styles/       Global styles and design tokens
```

## Commands

```bash
pnpm --filter @accounting-saas/frontend dev        # http://localhost:3001
pnpm --filter @accounting-saas/frontend build
pnpm --filter @accounting-saas/frontend start
pnpm --filter @accounting-saas/frontend typecheck
pnpm --filter @accounting-saas/frontend lint
pnpm --filter @accounting-saas/frontend test
```

The dev server uses port `3001` so the backend can own `3000`.

## Configuration

Two base URLs are read in `apps/frontend/lib/env.ts`:

| Variable                   | Used by | Meaning                                                                         |
| -------------------------- | ------- | ------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | browser | Host-reachable backend address (default `http://127.0.0.1:3000/api`)            |
| `INTERNAL_API_BASE_URL`    | server  | Address the Next.js server itself calls (in Compose: `http://backend:3000/api`) |

Both default to the local backend, so a fresh checkout runs without extra setup.
To override them for the frontend process only, create `apps/frontend/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3000/api
```

`apps/frontend/.env.local` is git-ignored. Never put a secret in a `NEXT_PUBLIC_*`
value: everything with that prefix is shipped to the browser.

The application shell renders the backend readiness report
(`GET <base>/health/ready`) as a local infrastructure status panel. It reads
operational endpoints only and contains no business data.

## Conventions

- UI language is Persian with `dir="rtl"` at the root layout (MVP scope).
- Process state (approvals, plans, periods) is read from the backend, never kept as
  local source of truth.
- Screens are built on the internal design system (TECH-005); don't couple product
  components directly to a third-party UI library API.
- Replace the placeholder strings in `app/page.tsx` once the localization approach is
  decided; the application shell is intentionally content-free.
