# Remediation Plan — Frontend

Companion to [frontend-security-audit-2026-11-08.md](./frontend-security-audit-2026-11-08.md).
Findings are referred to as `F1`…`F14`. `PR-*` refers to
[architecture-remediation-patterns.md](./architecture-remediation-patterns.md).

---

## F1 (High) — The whole `/panel` tree is public

### Root cause

`src/proxy.ts` treats `'/panel'` as a public prefix because the panel is currently a static preview. A *preview
convenience* became a *routing policy*.

### Fix — auth by default, preview by explicit flag

```ts
const PANEL_PREVIEW = process.env.PANEL_PREVIEW === '1' && process.env.NODE_ENV !== 'production';

const PUBLIC_PATHS = [
  ...(PANEL_PREVIEW ? ['/panel'] : []),
  '/login', '/register', '/forgot', '/terms', '/faq', '/about', '/contact',
];
```

Then enforce the real gate in the server layer (see F5) so it does not depend on the middleware at all:

```tsx
// src/app/(panel)/layout.tsx
const session = await getSessionAction();
if (!session.ok) redirect('/login');
return <AccountingPanelLayout account={toPanelAccount(session.session.principal)}>…</AccountingPanelLayout>;
```

`redirect()` in a Server Component is the boundary; the middleware stays a UX optimisation.

### Acceptance

- Anonymous `GET /panel/accounting` → `/login` (307), and the same for every panel and `store/*` route.
- With `PANEL_PREVIEW=1` locally, the preview still renders — and production builds ignore the flag.
- `proxy.test.ts` is updated with a `/panel`-requires-auth case (this test change is the announcement of the
  behavioural change).

---

## F2 (High) — Fake password recovery

### Root cause

`ForgotForm` is a UI prototype wired to `toast.success` — no API, no backend endpoint.

### Fix — three options, in order of preference

1. **Remove the flow until it works.** Delete `/forgot`, remove the «فراموشی رمز؟» link from `LoginForm`, and
   make `/forgot` a `notFound()`. Smallest honest change.
2. **Disable with an explanation**: keep the page but render a single panel — «بازیابی رمز عبور هنوز فعال
   نیست؛ با پشتیبانی تماس بگیرید» — with no form and no OTP step. No success toast anywhere.
3. **Implement for real**, but only with the backend: `POST /auth/password-reset/request` (always `202`, no
   oracle), `POST /auth/password-reset/confirm` with a single-use, short-TTL, hashed token, constant-time
   comparison, rate limited per IP **and** per identity, and a session revocation on success
   (`revokeActiveForUser` already exists). Until the backend ships, option 1 or 2 applies.

Whichever is chosen: the frontend must never report success for an operation that performed no work. Make that a
review rule — a `toast.success` after a handler that contains no `await` of a network call is a code smell worth
calling out.

### Acceptance

- No route under `(auth)` reports a successful password change.
- `grep -r "شبیه‌سازی" src` returns nothing in a shipped path.

---

## F3 (High) — Hard-coded `localhost` rewrites for `/admin` and `/business`

### Root cause

`next.config.ts` proxies two other applications through the frontend origin, at development addresses, with no
authentication boundary of its own.

### Fix

1. **Do not proxy them through the public app.** They are separate applications; give them hostnames. Remove the
   four rewrites.
2. If a transition period is unavoidable, make the origin configuration-driven and keep them off in production:

```ts
const adminOrigin = process.env.ADMIN_APP_ORIGIN;   // undefined in production → no rewrite
const businessOrigin = process.env.BUSINESS_APP_ORIGIN;

async rewrites() {
  return [
    ...(adminOrigin ? [{ source: '/admin', destination: `${adminOrigin}/` },
                       { source: '/admin/:path+', destination: `${adminOrigin}/:path+` }] : []),
    ...(businessOrigin ? [...] : []),
  ];
}
```

Note that `next.config.ts` is evaluated at build time for rewrites; document that these must be set at **build**
for a self-hosted image, or convert them to route handlers that read runtime config.

3. Whatever the transport, `/admin` must have its own auth check on the target app. A rewrite is not a gate.

### Acceptance

- A production build with no admin/business env vars serves `404` at `/admin` and `/business`.
- Neither path can reach an internal service through the public origin.

---

## F4 (Medium) — Edge gate accepts any cookie value

### Root cause

`hasUsableToken()` returns `true` for every non-JWT string, which is every real backend token.

### Fix

```ts
function hasUsableToken(token: string | undefined): boolean {
  if (!token) return false;
  return token.split('.').length === 3 ? !isTokenExpired(token) : isPlausibleOpaqueToken(token);
}

/** 43-char base64url for 256 bits; anything else is not a token this app issued. */
const OPAQUE_TOKEN = /^[A-Za-z0-9_-]{32,128}$/;
```

This is shape validation, not verification — it only stops `Token=x` and similar garbage from passing. The
authoritative check is the session read in the layout (F5). Keep the code comment that says so, but do not let a
"preview" flag (F1) rely on it.

### Acceptance

- `Token=x` → redirect to `/login` for protected paths.
- A real token still passes; a 43-char opaque token passes the shape check.
- `proxy.test.ts` gains a "garbage cookie is not authenticated" case.

---

## F5 (Medium) — No auth state in the panel; dead `useSession` / `LogoutButton`

### Root cause

The session utility and the logout control exist but were never wired into the shell; `PanelLayout` receives no
`account`, so it renders placeholders.

### Fix — one server read, one client control

```tsx
// src/app/(panel)/layout.tsx (Server Component)
import { redirect } from 'next/navigation';
import { getSessionAction } from '@/core/features/auth/lib/auth-storage';

export default async function PanelRouteLayout({ children }: { children: ReactNode }) {
  const session = await getSessionAction();
  if (!session.ok) redirect('/login');

  return (
    <AccountingPanelLayout
      account={{
        name: session.session.principal.displayName,
        description: session.session.principal.email,
      }}
      headerActions={<LogoutButton />}
    >
      {children}
    </AccountingPanelLayout>
  );
}
```

Extend `AccountingPanelLayout` to forward `account` and `headerActions` to `PanelLayout` (both props already
exist in `packages/web`).

Client-side, use `useSession()` only where a live refresh is needed (e.g. a session-expiry banner); on
`401` it already clears the cookie — keep that behaviour and add `router.replace('/login')`.

After this lands, delete the `useSession` "unused export" smell by actually using it, or remove it. Dead security
code is worse than no code, because it looks like protection.

### Acceptance

- Panel shows the signed-in user's name and email.
- Sign-out is reachable from every panel page and lands on `/login`.
- Expiring the session server-side and reloading a panel page redirects to `/login`.

---

## F6 (Medium) — "Remember me" outlives the session

### Root cause

`remember` only extends the **cookie** (30 days) while the backend session stays at 60 minutes, and the checkbox
defaults to `true`.

### Fix

1. If the backend does not support longer sessions, **remove the checkbox** and always bind the cookie to
   `expiresAt`. The UI must not promise a session it cannot keep.
2. If it should exist, send it to the backend (`signIn` command gains `remember?: boolean`), have the API issue a
   longer `expiresAt`, and derive the cookie lifetime from the response (the code already does this when
   `remember` is false).
3. Regardless: default to `false`, and make `FALLBACK_MAX_AGE` come from configuration rather than a hardcoded
   `60` (`AUTH_SESSION_TTL_MINUTES` on the frontend is undocumented — see F14).

### Acceptance

- With no remember-me, the cookie and the server session expire at the same instant (`expiresAt`).
- If remember-me exists, the API response drives the cookie lifetime, and a 30-day cookie is impossible to obtain
  for a 60-minute session.

---

## F7 (Medium) — No security headers

### Fix — one `headers()` block

```ts
async headers() {
  return [{
    source: '/:path*',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ...(process.env.NODE_ENV === 'production'
        ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
        : []),
    ],
  }];
},
poweredByHeader: false,
```

A CSP is worth adding next, in report-only first, because the app renders financial data: start from
`default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; frame-ancestors 'self'` and
tighten after observing violations. Next.js needs a nonce or `'unsafe-inline'` for its inline bootstrap — choose
deliberately and document it.

### Acceptance

- `curl -I` shows the headers, and `X-Powered-By` is gone.
- HSTS appears only in production responses.

---

## F8 (Low) — Post-auth redirect to `/`

### Fix

```ts
export const AFTER_SIGN_IN_PATH = '/panel';
```

Better: honour an allowlisted `?next=` (relative paths only):

```ts
export function safeNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/panel';
  return raw;
}
```

`//evil.com` is an absolute URL in a browser — the leading-`//` check is the whole point.

### Acceptance

- Sign-in lands on `/panel`.
- `?next=//evil.com` lands on `/panel`, not on an external site. Unit test it.

---

## F9 (Low) — Dotted paths skip the middleware

### Fix

```ts
matcher: ['/((?!api|_next/static|_next/image|favicon.ico|common|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?)$).*)'],
```

### Acceptance

- A protected future route like `/panel/reports/2026.11` is matched by the middleware (test the regex directly,
  as `proxy.test.ts` already does for its matcher cases).

---

## F10 (Low) — `getAccessToken()` reads an `httpOnly` cookie

**Fix** Delete the client-side function. Keep `getAccessTokenSSR()`. If a client component ever needs identity,
it gets it from a Server Component prop or a Server Action — not from `document.cookie`, which can never work for
an `httpOnly` token and invites someone to weaken the cookie to make it work.

### Acceptance

- `grep -r "document.cookie" src` returns nothing.

---

## F11 (Low) — Default metadata

Update `src/app/layout.tsx` (`title: { default: 'تراز | حسابداری یکپارچه', template: '%s | تراز' }`, a real
description, `metadataBase` from configuration) and add per-page titles where they are missing (`/forgot`,
marketing pages).

---

## F12 (Low) — `401` always means "wrong password"

### Fix — branch on the stable code the backend already sends

```ts
switch (normalized.code) {
  case 'ACCOUNT_LOCKED_OUT':
    return 'حساب شما موقتاً قفل شده است. چند دقیقه بعد دوباره تلاش کنید.';
  case 'SESSION_EXPIRED':
  case 'SESSION_REVOKED':
    return 'نشست شما منقضی شده است. دوباره وارد شوید.';
  case 'AUTHENTICATION_REQUIRED':
    return 'برای ادامه وارد حساب کاربری شوید.';
  default:
    if (normalized.status === 401) return 'ایمیل یا رمز عبور نادرست است.';
}
```

**Caveat tied to B5**: if the backend makes lockout indistinguishable from a wrong password (recommended there),
this branch becomes dead for `ACCOUNT_LOCKED_OUT` — that is fine, keep the session cases and delete the lockout
case rather than reintroducing an oracle through the UI.

---

## F13 (Low) — Memberships page outside the shell

**Fix** Move `src/app/tenants/[tenantId]/memberships/page.tsx` to
`src/app/(panel)/panel/tenants/[tenantId]/memberships/page.tsx` so it inherits the panel gate and shell (F5),
or keep the path and add `export const metadata = { robots: { index: false, follow: false } }` plus a guard in
the layout. Prefer the first: one gate, one shell.

Also: `MembershipsView` filters only the current page (documented in the component) — either send `search` to the
API when the backend supports it, or label the field «جستجو در این صفحه» so the scope is honest.

---

## F14 (Info) — Undocumented session TTL on the frontend

**Fix** Either document `AUTH_SESSION_TTL_MINUTES` in the frontend's env contract (and in `.env.example`'s frontend
section) or — better — stop reading it: bind the cookie to the `expiresAt` the API returns. One source of truth,
already present in the response.

---

## Architectural fix that removes several findings at once

`F3`, `F4`, `F6`, `F7` and the CORS finding (`B9`) all exist because the browser and the backend talk directly
across origins with a bearer token in a cookie the browser cannot read. Formalise the **BFF** (backend-for-frontend)
shape that the codebase already half-implements:

- Browser → Next.js only. Every authenticated read/write goes through a Server Action or a Route Handler.
- The token lives in an `httpOnly` cookie read **only** on the server; the browser never sees it, never sends it
  to the API, and `NEXT_PUBLIC_API_BASE_URL` disappears from the browser path.
- `INTERNAL_API_BASE_URL` is the only API address, so CORS is irrelevant for application traffic (keep it locked
  to nothing) and the frontend/back split is a deployment detail.
- CSRF is handled by Next's Server Action origin checks plus `sameSite: 'lax'`; add a double-submit token only if
  a cookie-authenticated Route Handler is added later.

This is `PR-4` in the patterns doc, and it is the single change with the highest long-term payoff on this side.

---

## Verification

```bash
pnpm --filter frontend lint
pnpm --filter frontend test
pnpm --filter frontend build     # catches next.config/rewrites/headers mistakes
```

Manual checks worth doing once after the changes (not exhaustive): anonymous `/panel/x` → `/login`; sign-in → panel
with the right name; sign-out → `/login`; a garbage `Token` cookie → `/login`; `curl -I` for headers.

New/updated tests: `proxy.test.ts` (panel protected, garbage cookie rejected, dotted path matched),
`mapAuthError.test.ts` (session codes), `auth-storage.test.ts` (cookie lifetime equals `expiresAt`),
`safeNext.test.ts`.

---

## Suggested sequencing

1. **F1 + F5** together (gate + session wiring; they are one change in practice).
2. **F2** (delete or disable the fake flow — smallest, highest trust impact).
3. **F3 + F7 + F9** (deployment correctness and headers).
4. **F4 + F6 + F12** (auth polish).
5. **F8, F10, F11, F13, F14** (cleanup).
6. Then start `PR-4` (BFF) as a deliberate piece of work rather than an accidental drift.
