# Frontend Audit — 2026-11-08

Scope: `apps/frontend` (Next.js 16 App Router, `src/proxy.ts` edge gate, all route groups and panel routes) and the shared `packages/web` UI/API primitives it depends on.
Method: static review only. No browser run, no build, no dependency audit.

---

## Summary

| # | Severity | Finding |
|---|----------|---------|
| 1 | **High** | The entire `/panel` tree is declared public in the edge gate |
| 2 | **High** | Password recovery is a fake flow that reports success |
| 3 | **High** | `/admin` and `/business` are proxied to hard-coded `localhost` ports from the public origin |
| 4 | **Medium** | The edge gate treats *any* opaque cookie value as a valid session |
| 5 | **Medium** | No authentication state anywhere in the panel — no session read, no sign-out, dead `useSession`/`LogoutButton` |
| 6 | **Medium** | "Remember me" stores a 30-day cookie for a 60-minute server session |
| 7 | **Medium** | No security headers, `X-Powered-By` left on |
| 8 | **Low** | Sign-in/sign-up redirect to the marketing home, not the panel |
| 9 | **Low** | Paths containing a `.` bypass the middleware matcher entirely |
| 10 | **Low** | `getAccessToken()` reads `document.cookie` for an `httpOnly` token |
| 11 | **Low** | Root metadata is still the `create-next-app` default |
| 12 | **Low** | `mapAuthError` collapses every `401` into "wrong email or password" |
| 13 | **Low** | `/tenants/:tenantId/memberships` is indexable and sits outside the panel shell |
| 14 | **Info** | `AUTH_SESSION_TTL_MINUTES` is read in a client-facing bundler context |

---

## 1. High — Every panel route is public

**Where** `src/proxy.ts:8-13`

```ts
const PUBLIC_PATHS = [
  '/panel', // Static panel preview; no sign-in is required.
  '/login', ...
];
```

`matches()` treats `'/panel'` as exact **or any sub-path**, so `/panel`, `/panel/accounting`, `/panel/inventory`, `/panel/audit-trail`, `/panel/settings`, `/panel/store/*` and every future panel module are all anonymous-accessible.

**Impact** Today the pages render `PanelPlaceholder`, so the exposure is a shell — but this is the routing gate for the whole product, and it is currently a deliberate no-auth decision buried in a cookie-check function. The first module that renders real tenant data (in a Server Component, where the middleware is the only gate) becomes a public data leak. The panel also advertises the full module map to anonymous visitors.

**Fix** Remove `'/panel'` from `PUBLIC_PATHS` and require an authenticated session for `(panel)`. If the static preview must stay, gate it behind an explicit env flag (`PANEL_PREVIEW=1`) that is impossible to enable in production, rather than a path allowlist.

---

## 2. High — "Forgot password" is simulated and tells the user it worked

**Where** `src/core/features/auth/components/block/ForgotForm.tsx:44-66`

```ts
const sendCode = step1.handleSubmit((data) => {
  setRecoveryId(data.id);
  toast.success('کد ارسال شد (شبیه‌سازی)');   // "code sent (simulated)"
  setStep(2);
});
...
const resetPassword = step2.handleSubmit(() => {
  toast.success('رمز عبور تغییر کرد. وارد شوید.');  // "password changed"
  setTimeout(() => router.push('/login'), 1200);
});
```

No API call is made at any step. The backend has no password-reset endpoint at all (`/auth` exposes only sign-up, sign-in, session, sign-out).

**Impact** A user locked out of their account is told their password was changed, then cannot sign in with the new one — the classic "recovery flow is broken" support burden, and a deceptive-success pattern that trains users to trust unverified security UI. The form also validates Iranian mobile numbers, implying SMS recovery that does not exist.

**Fix** Either hide `/forgot` (and its link on the login form) until the backend ships reset, or label it unmistakably as unavailable. Do not report success for an operation that did not happen.

---

## 3. High — Hard-coded `localhost` upstreams in `next.config.ts`

**Where** `next.config.ts:6-27`

```ts
{ source: '/admin', destination: 'http://localhost:3002/' },
{ source: '/admin/:path+', destination: 'http://localhost:3002/:path+' },
{ source: '/business', destination: 'http://localhost:3003/' },
...
```

**Impact**
- In any deployed environment these rewrites point at `localhost` **inside the frontend container**, so `/admin` and `/business` return 502/500 in staging and production.
- The rewrite means the public frontend origin serves another application. If that sub-app has weaker auth (they are separate apps on 3002/3003 with no visible gate), those panels become reachable through the main domain, bypassing whatever protection the main app has.
- Server-side rewrites to `http://` from a `https://` origin are also a mixed-content/TLS assumption problem behind a proxy.

**Fix** Move the upstream origins into environment configuration, and do not expose `/admin` / `/business` through the public app at all — host them on their own hostnames. If they must remain, they need their own authentication boundary, not just a rewrite.

---

## 4. Medium — The edge gate accepts any cookie value

**Where** `src/proxy.ts:29-33`

```ts
function hasUsableToken(token: string | undefined): boolean {
  if (!token) return false;
  if (token.split('.').length === 3) return !isTokenExpired(token);
  return true;   // any non-JWT string counts as authenticated
}
```

The backend token is an opaque base64url string, so the JWT branch never applies in practice and this reduces to "a cookie named `Token` exists". An attacker can set `Token=x` in their own browser and pass every middleware redirect.

**Impact** The middleware is not a security boundary — which is fine *if* everything behind it re-verifies server-side. It does not: panel pages do no session check, and the memberships page does verify only because it calls the backend. So any page added that trusts the middleware for identity is broken by construction. The code comment acknowledges this ("این فقط یک چک خوش‌بینانه"), but the `PUBLIC_PATHS` decision in finding 1 shows the caveat was not carried into the routes.

**Fix** Verify the session in the server layer that needs it (`getSessionAction()` in a `(panel)` layout or per-page), and treat the middleware purely as a UX redirect. Return `false` for non-JWT opaque values rather than `true`, so a stale/garbage cookie does not pass as authenticated.

---

## 5. Medium — The panel has no authentication state at all

**Where**
- `src/core/features/auth/hook/useSession.ts` — exported, **never imported anywhere**
- `src/core/features/auth/components/ui/Logout-Button/LogoutButton.tsx` — exported, **never imported anywhere**
- `src/core/features/panel/components/block/layout/AccountingPanelLayout.tsx` — renders `PanelLayout` with no `account` prop
- `packages/web/.../PanelAccount.tsx` — therefore always shows the placeholder `'حساب کاربری'` / `'حسابداری تراز'`

**Impact** After signing in, the panel shows no identity, offers no way to sign out (the only `LogoutButton` in the codebase is unused), and never validates the session. A user whose session expired keeps a panel shell that looks authenticated. `useSession` already implements the correct 401 → `clearAuthToken()` behaviour; it is simply not wired up.

**Fix** Read the session in `(panel)/layout.tsx` (or a server component wrapper), pass the principal into `PanelLayout`'s `account` prop, render `LogoutButton` in the header/sidebar, and redirect to `/login` on `401`.

---

## 6. Medium — "Remember me" outlives the session it remembers

**Where**
- `src/core/features/auth/components/block/LoginForm.tsx:26` — `defaultValues: { remember: true }`
- `src/core/features/auth/lib/auth-storage.ts:10-11, 19-21` — `REMEMBER_MAX_AGE = 30 days`
- `.env.example` / backend — `AUTH_SESSION_TTL_MINUTES=60`

**Impact** With the default checked, the browser keeps a `Token` cookie for 30 days while the token itself stops working after 60 minutes. Consequences: the edge gate (finding 4) treats the user as signed in for 30 days; `useSession` would clear the cookie on its first 401, but nothing calls it (finding 5); every protected page will 401 while the UI still looks logged in. Remember-me should extend the *server* session or be absent, not just the cookie.

**Fix** Either have the backend issue a longer-lived session when `remember` is requested (the field is currently a form-only flag that never reaches the API), or bound the cookie to `expiresAt` and drop the 30-day option. Also stop defaulting it to `true`.

---

## 7. Medium — No security headers

**Where** `next.config.ts` — no `headers()`, no `poweredByHeader: false`.

Missing: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options`/`frame-ancestors`, and any CSP. The app renders a financial panel and accepts credentials, so clickjacking protection and a baseline CSP are expected. `X-Powered-By: Next.js` is also still advertised.

**Fix** Add a `headers()` entry for `/:path*` with at least `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `SAMEORIGIN`/`frame-ancestors 'self'`, HSTS in production, and set `poweredByHeader: false`. A CSP can start in report-only.

---

## 8. Low — Post-auth redirect goes to the marketing page

**Where** `src/core/features/auth/hook/useSignIn.ts:9,45` and `useSignUp.ts:11,45`

`AFTER_SIGN_IN_PATH = '/'` while the success toast says "در حال انتقال به پنل..." ("redirecting to the panel"). New users land on the landing page and must find the panel themselves.

**Fix** Redirect to `/panel` (or the intended `?next=` target, allowlisted to same-origin relative paths — never an absolute URL from the query string).

---

## 9. Low — Paths with a dot skip the middleware

**Where** `src/proxy.ts:59`

```ts
matcher: ['/((?!api|_next/static|_next/image|favicon.ico|common|.*\\..*).*)']
```

`.*\..*` excludes any path containing a dot anywhere. Today no route has a dot, but a future `/panel/reports/2026.11` or a slug-based route is silently un-gated.

**Fix** Restrict the static-asset exclusion to actual asset extensions (`.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?)$`).

---

## 10. Low — `getAccessToken()` reads `document.cookie` for an `httpOnly` cookie

**Where** `src/core/lib/coockie/getAccess.ts:3-11`

The token cookie is set `httpOnly: true` (`setCoockie.ts:21`), so this function can only ever return `null`. It is exported beside the correct `getAccessTokenSSR()` and invites a future caller to "read the token on the client", which will fail at runtime or, worse, motivate making the cookie non-`httpOnly`.

**Fix** Delete the client variant; keep only the server reader.

---

## 11. Low — Default `create-next-app` metadata

**Where** `src/app/layout.tsx:9-12` — `title: 'Create Next App'`, `description: 'Generated by create next app'`.

Brand/SEO defect on a Persian RTL product; also visible in link previews for the auth and marketing pages.

---

## 12. Low — Every `401` is reported as a credential failure

**Where** `src/core/features/auth/utils/mapAuthError.ts:19-21`

```ts
if (hasPasswordPolicyError || normalized.status === 401) {
  return 'ایمیل یا رمز عبور نادرست است.';
}
```

The backend uses `401` for an expired session, a revoked session, a locked account and a missing token as well as a wrong password (`authentication-error.mapper.ts`). The frontend therefore tells a locked-out or expired user that their password is wrong, which sends them into a reset flow that is also fake (finding 2).

**Fix** Branch on `normalized.code` (`ACCOUNT_LOCKED_OUT`, `SESSION_EXPIRED`, `SESSION_REVOKED`, `INVALID_CREDENTIALS`) — the backend already sends a stable code.

---

## 13. Low — Memberships page sits outside the panel shell and is indexable

**Where** `src/app/tenants/[tenantId]/memberships/page.tsx`

It lives at the app root, not under `(panel)`, so it uses the root layout: no sidebar, no shell, and no `robots: { index: false }` (the `(panel)` and `(auth)` layouts set it; the root does not). The page renders member names and emails. Access is still enforced by the backend, so this is not a data leak — but the page is crawlable if the middleware gate is ever bypassed, and its UX does not match the rest of the product.

**Fix** Move it under `(panel)`, or add `robots: { index: false, follow: false }` and the panel shell.

---

## 14. Info — Session TTL read in a bundler-visible module

**Where** `src/core/features/auth/lib/auth-storage.ts:8,13`

```ts
import { env } from 'process';
const FALLBACK_MAX_AGE = (Number(env.AUTH_SESSION_TTL_MINUTES) || 60) * 60;
```

It sits inside a `'use server'` module so it does not reach the client bundle, and `AUTH_SESSION_TTL_MINUTES` is defined in the root `.env.example` for the backend. But the frontend has no documented contract for this variable, so a deploy that sets it only on the backend silently falls back to 60 minutes. Prefer deriving the cookie lifetime from the `expiresAt` the API already returns (which the code does when `remember` is false).

---

## Verified good

Recorded so the fixes above do not regress these:

- **No XSS sinks**: no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` or `document.write` anywhere in `apps/frontend/src`; all rendering goes through React text nodes.
- **Token is `httpOnly`** and `sameSite: 'lax'`, with `secure` in production (`setCoockie.ts`); it never lands in `localStorage` — the only storage use is the panel theme preference.
- **API client hardening** (`packages/web/api/client.ts`): normalized error contract with bounded string lengths, allowlisted categories, detail count cap, and a runtime Zod parse of every success payload, so a hostile/odd response cannot inject arbitrary fields into the UI.
- **Error text is never rendered as HTML**, and server actions return serialized (`serializeApiError`) errors rather than leaking raw response objects.
- **Server-side API calls use the internal base URL** (`INTERNAL_API_BASE_URL`) rather than the public one, so the browser is not the intermediary for authenticated reads.
- **Pagination input is validated and clamped** (1–100) on both read and write (`packages/web/ui/utils/pagination.ts`), so a crafted `?limit=` cannot ask the API for an unbounded page.
- **Middleware is not the only control on the one page that fetches data**: `/tenants/:tenantId/memberships` forwards the token server-side and the backend re-authorizes it, so a cross-tenant `tenantId` in the URL is refused by the API.
- **`proxy.test.ts` pins the public/guest-only behaviour**, including the `/loginx` non-prefix case, so a fix to `PUBLIC_PATHS` will be visible in a test diff.

## Not covered

Browser/DOM testing, visual and RTL review, accessibility audit beyond what the components declare, bundle/performance, `pnpm audit` on frontend dependencies, Storybook, and the marketing copy. Findings 1–7 were not reproduced at runtime; they follow from the source as written.
