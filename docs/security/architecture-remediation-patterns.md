# Architecture & Pattern Remediation

Shared guidance for the fixes in [backend-remediation-plan.md](./backend-remediation-plan.md) and
[frontend-remediation-plan.md](./frontend-remediation-plan.md).

The individual findings are mostly symptoms. Nine of the nineteen originate in five structural decisions, so
fixing those patterns is what prevents the next batch of findings. Each pattern states the problem, the target
design, where it applies in this repository, and how to know it is done.

---

## PR-1 — Give authority a *scope*, not just a permission

**Problem.** `AuthorizationPolicy` is `{ permission, tenantParam? }`. Absence of `tenantParam` silently means
"platform", and platform evidence is the union of the caller's memberships. So a capability granted inside one
company satisfies a requirement over global data. That is the root of the critical backend finding (B1) and the
`user.read` disclosure (B2).

**Target design.** A capability is always evaluated *in a scope*, and the scope is declared:

```ts
type AuthorizationPolicy =
  | { permission: string; scope: 'tenant'; tenantParam: string }
  | { permission: string; scope: 'platform' };   // systemAdmin or an explicit platform grant only
```

Rules that make it safe:

1. **Tenant capability keys are namespaced by the domain they act on** (`user.manage` inside a tenant means
   "manage this company's users"). A use case that touches a globally-owned table must be platform-scoped, and
   platform scope is never satisfiable by a membership.
2. **Platform authority has one source**: `platform_authorizations` (already persisted and read by
   `PlatformAuthorization`). Never infer it from roles.
3. **Every use case re-checks the object's scope**, not only the route: a guard protects the transport, the use
   case protects the invariant. Jobs and other modules call use cases directly.
4. **Deny-by-default stays**: an endpoint declaring nothing is refused. Extend that to "declaring a capability
   without a scope is a wiring error", refused at startup with a named endpoint.

**Where.** `infrastructure/api/authorization/authorization-policy.ts`, `authorization.guard.ts`,
`authorize-action.use-case.ts`, every controller in `modules/identity/presentation/controllers/`.

**Done when.** The OpenAPI document has no route whose permission can be satisfied from a membership while its
handler writes globally-owned rows, and a startup check rejects an ambiguous policy.

---

## PR-2 — Tenant isolation as a *layered* invariant, not a helper you must remember

**Problem.** Isolation is enforced by `tenantEq` / `assertTenantOwnership` / `assertTenantCriterion` — good
primitives, but opt-in, and one interceptor still falls back to a client-supplied route value (B11).

**Target design — four independent layers, any one of which fails closed:**

| Layer | Mechanism | Protects against |
| --- | --- | --- |
| Route | `AuthorizationGuard` proves membership in the claimed tenant | cross-tenant requests |
| Ambient scope | `TenantScopeInterceptor` publishes only the **verified** tenant | handler forgetting the tenant |
| Query | `tenantEq` / `assertTenantCriterion` in every adapter | a use case that forgot the scope |
| Write | `assertTenantOwnership` before every statement | writing a foreign aggregate |

Make the fourth layer structural rather than advisory:

1. Make `tenantEq` the *only* exported way to build a tenant predicate, and add a repository test
   (a table-driven spec like the existing `tenant-filter-contract.spec.ts`) that fails when a repository on a
   tenant-owned table has no `tenantEq`/`assertTenantCriterion` in its query. Today that test exists for one
   module; extend the contract to every adapter.
2. Keep `requireSystemScope` for genuinely cross-tenant questions and forbid `state: 'missing'` from ever
   behaving like "no filter" (already true — pin it with a test).
3. Add the negative e2e matrix: for each tenant-owned resource, tenant A token + tenant B id → 403/404. One
   table, one loop, run in CI. This is the highest-value test in the repository.

**Done when.** Deleting any one layer still fails the isolation matrix (i.e. no single point of failure).

---

## PR-3 — Configuration is a first-class, validated contract

**Problem.** Three findings (B4, B9, F3, F14) are all "a deployment fact is hard-coded or guessed": `trust
proxy` assumed off, CORS pinned to localhost, rewrites pointing at localhost, session TTL split across two apps.

**Target design.** The existing `loadConfiguration` pattern is right; extend its coverage so *every* fact that
varies per environment is declared, validated, and refused when wrong:

```ts
interface Configuration {
  // …existing…
  proxy:   { trust: false | number | readonly string[] };
  cors:    { allowedOrigins: readonly string[] };
  storage: { … };
  security: { appOrigin: string; cookieDomain?: string };
}
```

Rules:

1. **No literal URL in code.** A `localhost` in `next.config.ts` or a `http://` in a controller is a bug, not a
   default.
2. **Validation is fail-fast and collects all problems** (already the house style). Reject `*` CORS in
   production, non-`https` origins in production, and `trust proxy: true` in every environment.
3. **Cross-field checks**, e.g. "production + `BEHIND_PROXY=true` + `proxy.trust=false` refuses to boot".
4. **One `.env.example` section per consumer** so the frontend and backend contract is visible: a variable used
   by both apps is documented once, and neither app reads an app-specific variable implicitly (`AUTH_SESSION_TTL_MINUTES`
   is currently backend-only but consumed on the frontend).

**Done when.** `grep -rn "localhost" apps/backend/src apps/frontend/src apps/frontend/next.config.ts` returns only
`:5000`-style test fixtures, and a misconfigured production start fails with a named variable.

---

## PR-4 — A real BFF boundary between the browser and the API

**Problem.** The browser talks to the API directly with a bearer token stored in a cookie it cannot read
(`httpOnly`) — while some calls go through Server Actions. That hybrid causes: CORS coupling (B9), the
middleware's impossible token check (F4), remember-me vs session mismatch (F6), and exposure of the API origin
to the public.

**Target design.**

```
Browser ──(same-origin, httpOnly cookie)──► Next.js (Server Actions / Route Handlers)
                                              │
                                              └──(INTERNAL_API_BASE_URL, Bearer)──► NestJS
```

1. **One address for the API on the server** (`INTERNAL_API_BASE_URL`); delete the browser-facing
   `NEXT_PUBLIC_API_BASE_URL` from every data path.
2. **One way to call it**: a thin `serverApi(token, path, init)` used by Server Actions and Route Handlers. No
   `fetch` in client components.
3. **The token never reaches client JS** — no `document.cookie` reads, no token in a prop, no token in
   `localStorage`.
4. **Session lifecycle in one place**: `getSessionAction()` + `signOutAction()`; a `(panel)` layout performs the
   check, and a `401` from any server action means "clear cookie + redirect to `/login`" via one helper.
5. **CORS becomes irrelevant for application traffic**: keep it locked to nothing (or to a documented admin
   origin), since browsers no longer call the API cross-origin.

Trade-offs, stated honestly: an extra hop of latency, Next.js becomes a security-critical component (it already
holds the token), and streaming/upload paths need Route Handlers rather than Server Actions. Those are cheaper
than a distributed CORS + cookie + origin policy.

**Done when.** Browser devtools show no request to the API host; the only cookie is `httpOnly`; the API's CORS
allowlist is empty in production.

---

## PR-5 — Errors are a contract, and the UI branches on codes, not on statuses

**Problem.** The backend already sends a stable `code` (`INVALID_CREDENTIALS`, `SESSION_EXPIRED`,
`ACCOUNT_LOCKED_OUT`, `RATE_LIMITED`), but the frontend collapses `401` into "wrong password" (F12) and the
lockout code leaks account existence (B5). Two layers disagree about what an error means.

**Target design.**

1. **Backend**: the public error vocabulary is *deliberately coarse* where it could be an oracle (authentication
   reasons collapse; the detail lives in audit only) and *precise* where it is actionable (`RATE_LIMITED`,
   `TENANT_REQUIRED`, `CONFLICT`, validation details per field).
2. **Frontend**: a single `mapApiError()` keyed on `code` first, `status` second, with a default that never
   invents a meaning. One table, tested.
3. **Write it down**: a `docs/api/error-codes.md` table — code, HTTP status, public message, when the UI should
   do what. Reviewers then reject a new code that has no UI contract.

**Done when.** `mapAuthError` has no `status === 401` catch-all that precedes the code branches, and every code
in `API_ERROR_CODES` plus every domain code used by a UI path appears in the documented table.

---

## PR-6 — Limits are deny-by-default, and the subject of a limit is normalized

**Problem.** Only some routes are throttled (B3, B8); the identity subject is the raw body value (B6). The pattern
that produced this is "add `@RateLimit` where it occurred to us".

**Target design.**

1. **Global `RateLimitGuard`** with a conservative default (e.g. 60 req/min/IP), and `@RateLimit` to tune a
   route. A new endpoint is therefore limited without anyone remembering.
2. **Expensive operations declare their cost**, not their route: sign-in/sign-up/credential-set go through a
   bounded derivation semaphore (B3.2), so the cheap-path limit and the expensive-path concurrency are separate
   controls.
3. **Normalize the subject with the same primitive the use case uses** (`UserEmail`), and key buckets with an
   HMAC, never a 32-bit hash.
4. **Ranking of controls**: edge/WAF → global app limit → per-route limit → per-identity limit → durable lockout.
   Each layer assumes the previous one failed.

**Done when.** Removing `@RateLimit` from a route leaves it limited by the default; the identity-bucket test
proves case/whitespace variants share one bucket.

---

## PR-7 — "Public" must be an explicit, reviewable act; previews are flags

**Problem.** `@Public()` is a single decorator with no justification, and the frontend copies the idea with a
`PUBLIC_PATHS` array that currently contains the whole panel. Both are one-line decisions that quietly remove a
security boundary.

**Target design.**

1. **Backend**: `@Public()` carries a reason, and the reason is asserted by a test:

```ts
export const Public = (reason: string): CustomDecorator => SetMetadata(PUBLIC_ENDPOINT_METADATA, { reason });
```

A spec enumerates every public handler and pins the allowlist — adding a public endpoint fails the test until the
list is updated, which forces the conversation.

2. **Frontend**: the same idea, one array plus a spec. Preview modes are environment flags
   (`PANEL_PREVIEW`) that are *impossible* in production, never a path in the allowlist.
3. **Deny-by-default already holds on the backend**; make it hold on the edge too: a route is protected unless it
   is in the pinned allowlist, and the allowlist has an owner in review.

**Done when.** Adding a public endpoint or a public frontend path requires editing a pinned list plus a test
fixture, in one visible diff.

---

## PR-8 — Security tests live beside the invariant, not beside the feature

The repository already has good module-boundary and framework-independence specs. Extend that instinct to
security, in this order of value:

1. **Cross-tenant matrix** (highest value): resource × (own tenant, other tenant, no membership, systemAdmin).
2. **Public-surface snapshot**: the list of unauthenticated endpoints and routes, pinned.
3. **Configuration rejection tests**: bad values fail startup with a named variable.
4. **Auth lifecycle e2e**: sign-up → sign-in → session → credential change (all sessions revoked) → sign-out →
   old token 401. Already partially covered; make the revocation assertion explicit.
5. **Expensive-path test**: N concurrent sign-ups keep memory bounded.

Each of these is a table, not a story. Prefer a failing test that names the invariant over a comment that
describes it.

---

## PR-9 — Documentation that cannot drift

**Problem.** Several findings are documentation-shaped: stale "unguarded" comments (B14), an audit report that
must be regenerated by hand, a security policy that describes intent rather than controls.

**Target design.**

1. **Doc comments describe the mechanism, not the aspiration.** "This requires `user.manage` in the target
   tenant, enforced by `AuthorizationGuard`" — not "authorization arrives later".
2. **`SECURITY.md` links to the current control inventory** (`docs/security/`), so a reader can see what exists
   rather than what is planned.
3. **One index** (`docs/security/README.md`) lists audits, plans, and the patterns doc, with dates and the
   commit they describe.
4. A PR that changes a guard, a public route, or a rate-limit policy updates the corresponding entry. That rule
   is cheaper than any automation and is the one that actually gets followed.

---

## Combined roadmap

| Phase | Work | Why together |
| --- | --- | --- |
| 1 | PR-1 (+ B1, B2) | One authority-model change; everything else layers on it |
| 2 | PR-3 (+ B4, B9, F3, F14) | Configuration facts; small, independent, unblocks deployment |
| 3 | PR-6 (+ B3, B6, B8) | Limits and expensive paths; one shared piece of work |
| 4 | PR-7 (+ F1, F5) | Make the boundary explicit on both sides at once |
| 5 | PR-5 (+ B5, F12) | Error contract alignment |
| 6 | PR-4 (frontend BFF) | Architectural, needs its own design review |
| 7 | PR-2 hardening, PR-8, PR-9 | Continuous, folded into normal PRs |

Items deliberately *not* scheduled here because they need a product decision: whether tenant admins may manage
identities at all (B1 design A vs B), whether sign-up enumeration matters (B13), and whether password recovery
ships this cycle (F2).

---

## Reading order for a reviewer

1. `docs/security/backend-security-audit-2026-11-08.md` — what is wrong, with evidence.
2. `docs/security/backend-remediation-plan.md` — the fix for each finding, with tests.
3. `docs/security/frontend-security-audit-2026-11-08.md` — the same for the UI.
4. `docs/security/frontend-remediation-plan.md` — the UI fixes.
5. This document — why the fixes are shaped that way, and what stops the next batch.
