# Remediation Plan — Backend

Companion to [backend-security-audit-2026-11-08.md](./backend-security-audit-2026-11-08.md).
Every finding gets: root cause → chosen fix → code-level shape → test that proves it → acceptance criteria.
Findings are referred to by their audit number (`B1`…`B14`). `PR-*` refers to pattern changes in
[architecture-remediation-patterns.md](./architecture-remediation-patterns.md).

---

## B1 (Critical) — Cross-tenant takeover through platform-scoped `user.*`

### Root cause

`AuthorizationPolicy` has two shapes only: *tenant-scoped* (`tenantParam`) or *platform* (no `tenantParam`).
A platform requirement is satisfied by `resolvePlatformEvidence`, which unions the permissions of **all** the
caller's active memberships (`authorize-action.use-case.ts:277-306`). So `user.manage` granted by company A
satisfies the requirement for every company — while the identity tables it protects (`users`,
`user_credentials`) are global and are addressed by raw id.

The model conflates *"this capability exists in my company"* with *"this capability is platform-wide"*.

### Chosen fix — separate the two concepts, do not just add a `tenantParam`

Two legitimate designs. Pick **(A)** unless product has said tenant admins may never touch identities at all.

**A. Tenant-nested identity administration (recommended)**

Make the identity-admin resources tenant-owned in the API surface:

| Now | After |
| --- | --- |
| `POST /users` | `POST /tenants/:tenantId/users` (creates identity **and** membership, one transaction) |
| `PUT /users/:id/credential` | `PUT /tenants/:tenantId/users/:id/credential` |
| `POST /users/:id/status` | `POST /tenants/:tenantId/users/:id/status` |
| `GET /users/:id` | `GET /tenants/:tenantId/users/:id` |

and declare `@Authorize({ permission: 'user.manage', tenantParam: 'tenantId' })`.

Inside the use case, add the missing invariant: the target user must hold an **active membership in the
caller's tenant**. Put it in one place, not per use case:

```ts
// application/services/target-user-scope.ts
export async function assertUserInTenant(
  tenant: TenantReference,
  target: UserId,
  memberships: MembershipRepository,
): Promise<Result<void, DomainError>> {
  const membership = await memberships.findByUserAndTenant(target, tenant);
  return membership !== undefined && membership.aggregate.isActive()
    ? Result.ok(undefined)
    : Result.fail(new NotFoundError('The requested record was not found.'));
}
```

A user outside the tenant then answers exactly like a missing one — no existence oracle.
`SetUserCredential`, `ChangeUserStatus`, `UpdateUser`, `GetUser` each call it first.

**B. Platform admin only**

Keep the routes flat but make the capability unreachable from memberships:

```ts
export interface AuthorizationPolicy {
  readonly permission: string;
  readonly tenantParam?: string;
  /** Platform requirements are not satisfiable by a tenant membership. */
  readonly scope?: 'tenant' | 'platform';
}
```

`AuthorizationGuard` passes `platformOnly: policy.scope === 'platform'`, and
`AuthorizeActionUseCase` answers `platform=false` unless `platformAuthorization.hasSystemAdmin(userId)` is
true. Then `user.manage` inside a tenant can never satisfy a `scope: 'platform'` policy.

### Also required either way

- `get-user` / `update-user` / `change-user-status` / `set-user-credential` must stop accepting a raw id with
  no scope check. A guard on the route is not enough: these use cases are also callable from jobs and other
  modules.
- Audit the credential change with the **caller's** user id as actor (`UserCredentialEstablished` currently
  records the *target* as actor — see `audit-trail-authentication-audit-recorder.ts`). An operator action must
  name the operator.

### Test (write first, must fail before the fix)

```ts
// test/cross-tenant-identity.spec.ts
it('tenant A admin cannot reset a user who only belongs to tenant B', async () => {
  const { tokenA } = await signInAs(seed.tenantAAdmin);
  const res = await put(`/api/v1/tenants/${seed.tenantA.id}/users/${seed.tenantBUser.id}/credential`)
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ password: 'Attacker-chosen-1!' });
  expect([403, 404]).toContain(res.status);
});

it('... cannot deactivate, read or recreate across tenants', async () => { /* same matrix */ });
```

### Acceptance

- The matrix above passes for `credential`, `status`, `PATCH`, `GET`.
- An audit record for a credential change names the caller, never only the target.
- No route in the OpenAPI document exposes `user.manage` without a tenant (or without `scope: 'platform'`).

---

## B2 (High) — Cross-tenant membership disclosure

### Root cause

`GET /users/:userId/memberships` is deliberately a system-scope read (`list-user-memberships.use-case.ts:47`)
but is reachable with `user.read` from **one** tenant.

### Fix

Choose per product intent:

1. **Self-service only** (most likely correct): keep the endpoint but drop the capability to a self-check —
   `@RequiresAuthentication()`, and inside the use case return `NotFound` unless
   `query.params.userId === principal.userId`. This is the only shape that needs no new permission.
2. **Tenant admin**: replace with `GET /tenants/:tenantId/memberships?userId=…` (already exists as a list) and
   delete the cross-tenant route.
3. **Platform admin**: keep as-is but require `systemAdmin` (`scope: 'platform'`, design B in B1).

Do **not** leave it open with `user.read`.

### Acceptance

- Signing in as a tenant-A `user.read` holder, `GET /users/{tenantBUser}/memberships` answers 403/404.
- A user can still read their own memberships (if option 1 is chosen).

---

## B3 (High) — Unauthenticated, unthrottled, expensive sign-up

### Root cause

`POST /auth/sign-up` is `@Public()` with no `RateLimitGuard`, and each accepted request performs
`scrypt(N=2^17)` (~128 MiB, hundreds of ms) plus writes.

### Fix — three layers, cheapest first

1. **Throttle it like sign-in** (`authentication.controller.ts`):

```ts
@Post('sign-up')
@Public()
@UseGuards(RateLimitGuard)
@RateLimit({ scope: 'auth.sign-up', perIp: true, perIdentity: 'email' })
```

2. **Bound concurrent KDF work process-wide** so a burst cannot exhaust the heap even under the threshold:

```ts
// infrastructure/security/derivation-limiter.ts
const MAX_CONCURRENT_DERIVATIONS = 4;   // configurable, per process
```

Wrap `ScryptPasswordHasher.hash` / `verify` / `verifyWithoutCredential` in a small semaphore (a `p-limit`-style
queue of ~20 lines; no dependency needed). Overload answers `503` after a short bounded wait — never unbounded
queueing.

3. **Defence in depth at the edge**: a WAF/ingress rule on `/api/v1/auth/*`, since the application-level limiter
   dies with the process.

Optional: lower the sign-up cost parameter (verification still adapts to the stored parameters, so it is a
forward-compatible change) — but the limiter is the real control.

### Acceptance

- 21 sign-ups from one IP in a minute → the 21st answers `429 RATE_LIMITED`.
- A load test of 50 concurrent sign-ups keeps RSS bounded and never returns 500 from the scrypt path.
- Password hashing parameters remain verifiable for existing credentials.

---

## B4 (High) — `trust proxy` unset, so IP throttling is global or spoofable

### Root cause

`rate-limit.guard.ts:48-55` uses `request.ip` and asserts "not enabled, as here". Nothing configures it, so the
value depends on a deployment detail nobody declared.

### Fix — configuration, not a code assumption

1. Add to `configuration.ts`:

```ts
proxy: { trust: readTrustProxy(raw, problems) }   // false | number (hops) | CIDR list
```

with `TRUST_PROXY_HOPS` (integer ≥ 1) / `TRUST_PROXY_CIDRS` (comma-separated, validated) in `.env.example`,
defaulting to **false**.

2. Apply it once, in `bootstrap.ts`, before any guard exists:

```ts
const http = app.getHttpAdapter().getInstance();
if (config.proxy.trust !== false) http.set('trust proxy', config.proxy.trust);
```

Never accept a bare `true`. A CIDR list or an exact hop count is the only safe form.

3. Add a startup check: in `production`, if `proxy.trust === false` while `NODE_ENV` says the app is behind a
   proxy (explicit `BEHIND_PROXY=true`), refuse to boot. A silent global rate limit is an outage waiting to
   happen.

### Acceptance

- Behind a two-hop proxy with `TRUST_PROXY_HOPS=2`, two clients with different `X-Forwarded-For` values get
  independent buckets.
- With `trust=false`, a spoofed `X-Forwarded-For` does not change the bucket.
- A misconfigured production start fails loudly instead of throttling everyone together.

---

## B5 (Medium) — Lockout as DoS and existence oracle

### Root cause

`SignInUseCase` answers a distinct `ACCOUNT_LOCKED_OUT` code, and any anonymous caller can lock any known
account with `AUTH_LOCKOUT_THRESHOLD` failures.

### Fix — keep the durable counter, change the surface and the shape

1. **One public answer**: map `UserLockedOutError` to `INVALID_CREDENTIALS` in
   `authentication-error.mapper.ts` (401, generic message). Keep the distinction in the **audit** record only
   (`authentication.denied`, reason `USER_LOCKED_OUT`).
2. **Do not extend on locked attempts** (already true) and **do not let an attacker keep the account locked**:
   add a decay so consecutive lockouts require increasing evidence — e.g. lock duration `min(base * 2^(n-1), cap)`
   with `n` reset by a success. Cheap, no schema change beyond a counter you already keep.
3. **Primary brute-force control stays the rate limiter + per-identity budget** (see B6); the lockout is a
   backstop, not the wall.
4. Optional product answer: notify the account owner (`AUTH_LOCKOUT_NOTIFY`) so a targeted lockout is visible.

### Acceptance

- 6 wrong passwords → the 6th response is byte-identical to a wrong-password response (status, code, message).
- The audit trail still distinguishes `SIGN_IN_FAILED`, `USER_LOCKED_OUT`, `LOCKED_OUT_ATTEMPT`.
- A second lockout in the window lasts longer than the first, and a success resets the escalation.

---

## B6 (Medium) — Per-identity limit bypassable by input shape

### Root cause

The guard keys the identity bucket on the raw body value (`rate-limit.guard.ts:60-92`) while sign-in normalizes
to lower-case via `UserEmail`; and `hashSubject` is a 32-bit non-crypto hash.

### Fix

1. Normalize in the guard, using the same primitive the use case uses:

```ts
const normalized = normalizeRateLimitSubject(policy.perIdentity, raw); // trim + toLowerCase for 'email'
```

2. Replace `hashSubject` with a keyed digest:

```ts
createHmac('sha256', key).update(value).digest('hex')   // key from AppConfigService, not literals
```

3. Fix the comment: the digest **is** persisted in Redis (as a key). Document it, or store an HMAC under a
   rotating key if the property "the store cannot confirm a guessed email" matters.

### Acceptance

- `Victim@Example.com`, ` victim@example.com `, `VICTIM@EXAMPLE.COM` consume **one** bucket.
- Two different emails never share a bucket by construction (HMAC), pinned by a unit test.
- The limiter unit test asserts expiry uses `PEXPIRE` (already true — keep it).

---

## B7 (Medium) — Public `/examples` in production

### Fix — two lines plus a test

```ts
// app.module.ts
...(config.environment.isProduction ? [] : [ExampleModule]),
```

`AppModule` is static; the smallest correct change is a `forRoot`-style dynamic module
(`AppModule.register(config)`) or moving `ExampleModule` behind an `@Conditional`-like provider. Registering it
conditionally in `main.ts` (build the module class from a factory) is also acceptable.

Alternative: keep the module and delete the controller from production by making `ExampleController` throw
`NotFound` in production for **all** routes (not just `probe/server-error`).

### Acceptance

- In `NODE_ENV=production`, `POST /api/v1/examples` answers `404` and the OpenAPI document does not list it.
- No unbounded `Map` reachable from an unauthenticated client.

---

## B8 (Medium) — Anonymous audit write amplification

### Root cause

Every anonymous rejection writes an `audit_records` row; only two auth routes are throttled.

### Fix — global baseline + aggregation

1. Register `RateLimitGuard` **globally** with a safe default (`@RateLimit` per route overrides), so no route is
   unthrottled by omission. Deny-by-default for limits matches the deny-by-default authorization style.
2. For `authentication.denied` on anonymous requests, aggregate: one row per `(ip-hash, window)` with a `count`
   and `lastOccurredAt`, instead of one row per request. Keeps the signal, removes the amplification.
3. Add a periodic counter metric so a spike is visible without reading the table.

### Acceptance

- 1 000 anonymous bad-token requests produce O(1) audit rows per window, not 1 000.
- A genuine operator investigating a single rejected sign-in still sees a record with reason + correlation id.

---

## B9 (Medium) — Hard-coded CORS

### Fix — configuration + strict validation

```ts
cors: {
  allowedOrigins: readOriginList(raw, 'CORS_ALLOWED_ORIGINS', problems),   // exact match, no wildcards
}
```

```ts
app.enableCors({
  origin: config.cors.allowedOrigins,          // [] in production by default
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-Tenant-Id'],
  maxAge: 600,
});
```

Reject any entry that is `*`, contains a path, or is not `https:` in production — at configuration load, not at
request time. Drop `credentials: true`: the API authenticates with a bearer header.

### Acceptance

- `CORS_ALLOWED_ORIGINS=*` in production fails startup with a named variable.
- A preflight from an unlisted origin is refused; from a listed origin it succeeds with the headers above.

---

## B10 (Low) — No security headers

Add one middleware (or `helmet` if the team prefers a dependency — check it is already used before adding):

```ts
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');           // JSON API: nothing here is cacheable
  res.setHeader('X-Frame-Options', 'DENY');
  if (config.environment.isProduction) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

`Cache-Control: no-store` on API responses also protects personalized data behind proxies — currently only
`/health` sets it.

---

## B11 (Low) — Interceptor fail-open fallback

**Fix**

```ts
if (tenantParam === undefined) return next.handle();
const verified = request.authorization;
if (verified?.tenantId === undefined) {
  return throwError(() => ApiErrorException.of(API_ERROR_CODES.TENANT_REQUIRED, {...}));
}
// publish verified.tenantId only — delete the claimedTenantId branch
```

Keep the route-claim comparison in the use case (`resolveScopedTenant`) for the "path must match scope" check;
the scope itself must never come from the path.

### Acceptance

- A tenant route executed without a verified authorization context answers `TENANT_REQUIRED` in a harness that
  omits the global guard (this is exactly how the fail-open path is reachable today).

---

## B12 (Low) — Weak subject hash

Covered by B6.2 (HMAC-SHA256). Also remove the "non-cryptographic is sufficient" rationale: it is not, when a
collision can deny a victim's sign-in or confirm a guessed email.

---

## B13 (Low) — Sign-up enumeration / squatting

**Decision needed, then implement one:**

- If enumeration matters: `POST /auth/sign-up` always answers `202` with a neutral body and sends a verification
  email; the user cannot sign in until verified. This also fixes squatting.
- If it does not: document the accepted trade-off in `SECURITY.md` and keep `409`.

Either way, add email verification **before** any password-reset feature ships, because reset will otherwise
inherit an unverified-identity model.

---

## B14 (Info) — Stale doc comments

Remove the "authorization is not part of this issue / unguarded" paragraphs in
`set-user-credential.use-case.ts`, `create-user.use-case.ts`, `create-membership.use-case.ts`. Convention: a
comment that describes a guard must name the policy it enforces, so drift is visible in review.

---

## Verification command set

Run from the repository root, keeping exit codes visible:

```bash
pnpm --filter @accounting-saas/backend typecheck
pnpm --filter @accounting-saas/backend lint
pnpm --filter @accounting-saas/backend deps:check
pnpm --filter @accounting-saas/backend test
pnpm --filter @accounting-saas/backend test:e2e
```

New tests required by this plan: `cross-tenant-identity.spec.ts`, `rate-limit-subject.spec.ts`,
`trust-proxy.spec.ts`, `tenant-scope-fail-closed.spec.ts`, `audit-aggregation.spec.ts`,
`config-cors.spec.ts`, `config-trust-proxy.spec.ts`.

---

## Suggested sequencing

1. **B1 + B2** with their matrix tests (one model change, highest risk).
2. **B3 + B4 + B9** (availability and deployment correctness — each is small and independently shippable).
3. **B5 + B6 + B8** (auth hardening, share the rate-limit work).
4. **B7, B10, B11, B12, B13, B14** (cleanup, can go in one "hardening" PR).
