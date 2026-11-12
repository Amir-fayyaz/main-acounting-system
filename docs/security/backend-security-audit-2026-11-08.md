# Backend Security Audit — 2026-11-08

Scope: `apps/backend` (NestJS, Identity / Tenant / Audit modules, API infrastructure).
Method: static review of source only. No dynamic testing, no infrastructure review, no dependency audit.
Severity reflects exploitability from an unauthenticated or ordinary-tenant-user position.

---

## Summary

| # | Severity | Finding |
|---|----------|---------|
| 1 | **Critical** | Global `user.*` endpoints let any tenant admin take over users of any other tenant |
| 2 | **High** | `GET /users/:userId/memberships` discloses any user's cross-tenant memberships |
| 3 | **High** | `POST /auth/sign-up` is unauthenticated, unthrottled and performs 128 MiB scrypt work |
| 4 | **High** | Rate-limit keys are broken behind a reverse proxy (`trust proxy` not configured) |
| 5 | **Medium** | Account lockout is a targeted DoS and an account-existence oracle |
| 6 | **Medium** | Per-identity rate limit is trivially bypassed (raw, un-normalized email in the key) |
| 7 | **Medium** | Public `/examples` resource stays enabled in production and grows unbounded |
| 8 | **Medium** | Every rejected authentication writes an audit row — unauthenticated write amplification |
| 9 | **Medium** | CORS is hard-coded to `http://localhost:3001` (deployment blocker) |
| 10 | **Low** | No security headers (helmet) on the API |
| 11 | **Low** | `TenantScopeInterceptor` falls back to the client-supplied path tenant |
| 12 | **Low** | Weak 32-bit hash used for rate-limit subject keys |
| 13 | **Low** | Sign-up reveals account existence via `409 CONFLICT`; no email verification |
| 14 | **Info** | Stale doc comments claim credential endpoints are unguarded |

---

## 1. Critical — Cross-tenant account takeover via platform-scoped `user.*` capabilities

**Where**
- `src/modules/identity/presentation/controllers/credential.controller.ts:52` — `PUT /users/:id/credential` declares `@Authorize({ permission: 'user.manage' })` with **no `tenantParam`**
- `src/modules/identity/presentation/controllers/user.controller.ts:74,103,125,164` — `POST /users`, `GET /users/:id`, `PATCH /users/:id`, `POST /users/:id/status`, all platform-scoped
- `src/modules/identity/application/use-cases/authorize-action.use-case.ts:277-306` — platform evidence is the **union of permissions across all of the caller's active memberships**
- `src/modules/identity/application/use-cases/set-user-credential.use-case.ts:70-80` — loads the target user by global id, no tenant check

**Why it is exploitable**
A user who holds `user.manage` in *any one* tenant satisfies the platform-level requirement. The endpoints then operate on the global `users` / `user_credentials` tables by raw id, which are **not tenant-owned**. Consequences, with one tenant-admin account:

1. `PUT /api/v1/users/{victimId}/credential` sets a password the attacker knows on a user who belongs only to another company, then signs in as that user. Full account takeover, cross-tenant.
2. `POST /api/v1/users/{id}/status` deactivates any user platform-wide (their sessions stop authenticating — see `get-authenticated-session.use-case.ts:110-118`).
3. `GET /api/v1/users/{id}` returns `displayName` + `email` for any user in the database.
4. `POST /api/v1/users` creates identities with an attacker-chosen email (account squatting).

The permission catalog even documents these as tenant capabilities: `permission.ts:88-91` — *"Read the users of a company"*, *"Create and update the users of a company"*. The declaration does not match that intent.

**Recommended fix**
- Either give the identity endpoints a tenant scope (`@Authorize({ permission: 'user.manage', tenantParam: 'tenantId' })` with tenant-nested routes, and check membership/target-user-belongs-to-tenant in the use case), or
- keep them platform-scoped but restrict them to `systemAdmin` only (an explicit `platform:*` capability), and never let a tenant-membership-derived `user.manage` satisfy them.
- Whichever is chosen, add a regression test: tenant A admin → `PUT /users/{user only in tenant B}/credential` must return 403/404.

---

## 2. High — Cross-tenant membership disclosure

**Where** `src/modules/identity/presentation/controllers/membership.controller.ts:218`
`GET /users/:userId/memberships` is declared `@Authorize({ permission: 'user.read' })` — platform-scoped — and `list-user-memberships.use-case.ts:47-54` deliberately runs a **cross-tenant read** (`TenantScope.runAsSystem`).

**Impact** Any holder of `user.read` in one tenant can enumerate the tenant ids, statuses, membership ids and timestamps of any user in the system. That is an inventory of every company a target belongs to — useful for targeting the finding above.

**Fix** Either remove the endpoint from tenant-user reach, scope it to `systemAdmin`, or make a tenant-scoped variant (`/tenants/:tenantId/memberships?userId=`) that only answers for the caller's own tenant. The doc comment at `membership.controller.ts:60-63` already asserts "a person's relationships span tenants" — that is exactly why it must not be reachable with a tenant-level capability.

---

## 3. High — Unauthenticated CPU/memory exhaustion through `/auth/sign-up`

**Where**
- `src/modules/identity/presentation/controllers/authentication.controller.ts:81-83` — `@Public()` with **no `RateLimitGuard`, no `@RateLimit`** (compare sign-in at lines 116-118)
- `src/modules/identity/infrastructure/security/scrypt-password-hasher.ts:44-52, 226-238` — every sign-up runs `scrypt(N=2^17, r=8)`, ~128 MiB of memory and hundreds of ms per request, with `maxmem = 256·N·r ≈ 268 MB`

**Impact** `POST /api/v1/auth/sign-up` costs one expensive KDF plus two writes per request, from any anonymous client, with no throttle. A few dozen concurrent requests exhaust a small container's memory; a loop saturates a worker core. The same KDF is also paid on *every* sign-in for non-existent emails (`verifyWithoutCredential`, deliberate anti-enumeration work) and by `PUT /users/:id/credential`.

**Fix**
- Apply `RateLimitGuard` + `@RateLimit({ scope: 'auth.sign-up', perIp: true })` to sign-up.
- Consider an edge/WAF rate limit and a global queue/concurrency cap around hashing (e.g. `p-limit`) so KDF work cannot be unbounded.
- Optionally lower cost for sign-up or accept that the guard is the control.

---

## 4. High — Rate limiting silently collapses or becomes bypassable behind a proxy

**Where** `src/infrastructure/api/rate-limit/rate-limit.guard.ts:48-55`

```ts
// Express `request.ip` respects the `trust proxy` setting: when not enabled
// (as here), it is the direct peer address …
const clientIp = request.ip ?? request.socket?.remoteAddress ?? 'unknown';
```

`trust proxy` is never configured anywhere in `apps/backend` (no `set('trust proxy', …)`), and `bootstrap.ts` does not touch it.

**Impact**
- **Behind nginx / a cloud LB (the normal production topology):** `request.ip` is the proxy's address for *every* client. The 20 req/min per-IP budget becomes a single global budget, so one attacker can exhaust auth throttling for the whole platform (self-inflicted outage of sign-in/session/sign-out).
- **If someone "fixes" it with `trust proxy: true`:** `X-Forwarded-For` becomes client-controlled and the per-IP limit is bypassed entirely by rotating the header.

**Fix** Make the proxy topology explicit configuration, e.g. a `TRUST_PROXY_HOPS` / `TRUST_PROXY_CIDRS` value read through `AppConfigService` and applied with `app.set('trust proxy', <value>)`, defaulting to `false`. Never use a bare `true`. Add an e2e test asserting the key derives from a spoofed-header-independent value.

---

## 5. Medium — Lockout is a targeted DoS and (indirectly) an account-existence oracle

**Where**
- `src/modules/identity/application/use-cases/sign-in.use-case.ts:115-118` — locked accounts answer `UserLockedOutError`
- `src/modules/identity/presentation/http/authentication-error.mapper.ts:43-56` — mapped to `401` with code `ACCOUNT_LOCKED_OUT`
- `.env.example` — `AUTH_LOCKOUT_THRESHOLD=5`, `AUTH_LOCKOUT_DURATION_MS=900000`

**Impact**
1. Five failed sign-ins (one minute's worth under the 5/min per-identity budget) lock a known account for 15 minutes. Any attacker who knows an email can keep any user permanently locked out. Combined with finding 3 there is no captcha/proof-of-work anywhere.
2. Because unknown emails always answer `INVALID_CREDENTIALS` while an existing account answers `ACCOUNT_LOCKED_OUT` after the threshold, the distinct code confirms the account exists — the opposite of the stated intent ("the reason is not disclosed").

**Fix** Answer the lockout state with the same public error code as a credential failure (keep the distinct code audit-side only), and consider a softer control: exponential per-account delay or a lockout that is transparent to the legitimate session holder, plus monitoring/alerts on repeated lockouts. Do not treat lockout as the primary brute-force control — the per-identity rate limit and MFA are.

---

## 6. Medium — Per-identity rate limit is bypassable

**Where** `src/infrastructure/api/rate-limit/rate-limit.guard.ts:60-92` and `170-183`

The identity subject is `hashSubject(rawBody[policy.perIdentity])` — the **raw** email, not the normalized one used by sign-in (`sign-in.use-case.ts` normalizes via `UserEmail`) and hashed with a non-cryptographic 32-bit function.

**Impact** `Victim@Example.com`, `victim@example.com `, `VICTIM@example.com` produce different buckets, so the 5-attempt identity budget is multiplied by casing/whitespace variants. Each variant still costs one sign-in attempt (bounded by the 20/min IP budget), so this is a real but bounded amplification of the credential-stuffing window — and it makes the per-identity limit unreliable as a metric.

**Fix** Normalize the subject exactly as the authentication path does (trim + lowercase) before hashing, or better, resolve the identity key from the same primitive (`UserEmail`). Replace `hashSubject` with `createHmac('sha256', processSecret).update(value)` or at least `sha256` so buckets cannot be collided on purpose (see finding 12).

---

## 7. Medium — Public `/examples` resource in production

**Where** `src/infrastructure/presentation/example/example.controller.ts:40` (`@Public()` on the controller) and `example.service.ts:22-45` (`Map`, no bound)

**Impact** Unauthenticated `POST /api/v1/examples` works in every environment, including production, and inserts into an unbounded in-memory map: memory exhaustion by an anonymous client, and an open write endpoint on the API. `/examples/probe/server-error` is correctly gated to non-production; the rest is not.

**Fix** Do not register `ExampleModule` when `config.environment.isProduction`, or delete the module before release.

---

## 8. Medium — Unauthenticated audit write amplification

**Where** `src/modules/identity/application/use-cases/get-authenticated-session.use-case.ts:80-86` (and every other rejection branch) → `audit-trail-authentication-audit-recorder.ts`

Every request carrying a bad/absent/expired token writes an audit row (`authentication.denied`). Only `/auth/session` and `/auth/sign-out` are rate limited; any other endpoint on the API triggers the write on each anonymous request.

**Impact** An unauthenticated attacker can drive unbounded growth of the `audit_records` table (disk, backup size, query cost) with trivial requests, which also pollutes the security trail they would be investigated in.

**Fix** Add a global baseline rate limit (or at least on the audit write path for anonymous rejections), and consider deduplicating/aggregating repeated `authentication.denied` records per IP+window.

---

## 9. Medium — CORS is hard-coded and will block the real frontend

**Where** `src/bootstrap.ts:66-72`

```ts
app.enableCors({
  origin: ['http://localhost:3001'],
  credentials: true,
  ...
});
```

**Impact** Any deployed frontend (preview, staging, production domain) is blocked by CORS. Two failure modes follow: the app "works locally only", and whoever fixes it under pressure may set `origin: true` with `credentials: true`, which would be materially worse. `credentials: true` is also unnecessary — the API authenticates with a bearer header, not cookies. `X-Tenant-Id`/`X-Requested-With` and a preflight cache are unconfigured.

**Fix** Drive the allowed origins from configuration (`CORS_ALLOWED_ORIGINS`, comma-separated, exact-match), default to empty/deny in production, drop `credentials`, and add `maxAge`.

---

## 10. Low — No security headers

No `helmet` (or equivalent) is installed. API responses carry no `X-Content-Type-Options: nosniff`, no `Strict-Transport-Security` (if TLS terminates at the app), no `Referrer-Policy`. Low impact for a JSON-only API, but cheap to add and expected by an audit.

---

## 11. Low — `TenantScopeInterceptor` fail-open fallback

**Where** `src/infrastructure/api/tenant/tenant-scope.interceptor.ts:95-101`

When `request.authorization` is `undefined` the interceptor publishes **the tenant id claimed in the route path** as the ambient scope:

```ts
const claimed =
  verified === undefined
    ? claimedTenantId(request, tenantParam)   // client-supplied
    : verified.tenantId;
```

Today the global `AuthorizationGuard` always populates `authorization` for tenant-scoped routes, so this is unreachable in the wired application — but it is a fail-open default in the security-critical path: if the guard is ever unregistered, reordered, or a module is assembled without it (test harness, worker-hosted controller), the tenant scope becomes whatever the client typed in the URL.

**Fix** Fail closed: if a tenant-scoped route has no verified `authorization`, respond `TENANT_REQUIRED` (400) — never fall back to the claim.

---

## 12. Low — Weak hash for rate-limit keys

`rate-limit.guard.ts:170-183` uses a 32-bit non-cryptographic hash of the subject and states "the subject value … is never logged or persisted", while `redis-rate-limiter.ts:64-66` persists the result as a Redis key. 32 bits is collision-prone by construction: an attacker can deliberately share a bucket with a victim (denying their sign-in), and the bucket is a fast offline dictionary for common emails.

**Fix** HMAC-SHA256 with a process secret (or plain SHA-256 if the input is already low-value), and update the comment to state that a keyed digest *is* persisted.

---

## 13. Low — Account enumeration and squatting at sign-up, no verification

`POST /auth/sign-up` answers `409 CONFLICT` for a taken email (`authentication.controller.ts:88-92`), which is an explicit account-existence oracle, and there is no email verification, so any address can be registered by anyone. Password reset ("forgot password") does not exist yet, so this is currently low impact — but note that a reset flow added later will inherit an unverified-email identity model.

**Fix** Decide deliberately: if enumeration matters, return a generic success and send a verification email; otherwise document the accepted trade-off. Add email verification before a password-reset feature lands.

---

## 14. Info — Stale documentation contradicts the code

- `set-user-credential.use-case.ts:46-48`: *"Authorization is explicitly not part of this issue … the operation is unguarded until authorization is enforced"* — it is guarded (finding 1 is about *which* capability).
- `create-membership.use-case.ts` / `create-user.use-case.ts` carry the same stale claim.

Remove or correct these before they are used as justification for weakening a guard.

---

## Controls that are in good shape

Worth recording so the fixes above do not regress them:

- **Deny-by-default authorization**: `AuthorizationGuard` is registered as a global `APP_GUARD` (`app.module.ts:70-77`); an endpoint declaring nothing is refused. Tenant claims are verified against membership, and a conflicting `x-tenant-id` header is denied rather than honoured (`authorization.guard.ts:275-313`).
- **Session tokens**: 256 bits from the CSPRNG, stored only as SHA-256 (`crypto-session-token-service.ts`), never logged, single-use at sign-in, absolute expiry, revocation retained as state.
- **Passwords**: scrypt with OWASP parameters, per-credential salt, `timingSafeEqual`, hostile stored parameters rejected before derivation, plaintext never serialized (`plain-password.ts` masks `toString`/`toJSON`).
- **Tenant isolation primitives**: `tenantEq` / `assertTenantOwnership` / `assertTenantCriterion` / `requireSystemScope` fail closed, and `findByUserId` refuses to run outside a system scope (`drizzle-membership.repository.ts:155-166`).
- **Audit refusal path**: `AuthorizeActionUseCase.deny` records the denial without ever storing the unverified tenant claim, and does not let a tenant scope escalate to system.
- **Configuration/secret hygiene**: env access funnelled through `loadConfiguration`, credentials mandatory in production, log redaction built from the values actually held, 5xx logged but never serialized to the client.
- **Validation**: `whitelist + forbidNonWhitelisted + transform` globally, so mass-assignment is rejected rather than silently ignored.

---

## Suggested order of work

1. Findings 1 and 2 (one change to the identity capability model; write the cross-tenant tests first).
2. Finding 3 and 4 (cheap, high-leverage availability fixes).
3. Findings 5, 6, 7, 8 (auth hardening).
4. Findings 9–13 (configuration and polish).

## Not covered by this audit

Dynamic testing, penetration testing, dependency/CVE scanning (`pnpm audit`), infrastructure and container configuration, TLS/secrets management, backup/restore, frontend security, and the accounting/inventory modules (reviewed only for tenancy primitives, not business logic).
