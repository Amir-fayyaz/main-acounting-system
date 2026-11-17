# @repo/web/session

Thin, session-only shared package for authentication state management.

## Overview

This package provides a minimal session layer that allows product apps (`web-business`, `web-admin`) to read session, protect routes, and sign out — without owning login/register forms or sign-in logic.

**Key Principle:** Login / register / forgot-password pages and forms live **only** in `apps/frontend`. Product apps only consume session.

## Package API

### Types

```typescript
import { Principal, SessionResponse } from '@repo/web/session';

interface Principal {
  userId: string;
  displayName: string;
  email: string;
}

interface SessionResponse {
  sessionId: string;
  expiresAt: string;
  principal: Principal;
}
```

### Cookie Contract

- Cookie name: `Token`
- httpOnly: true
- secure: true in production
- sameSite: 'lax'
- path: '/'

### Server Actions

```typescript
import { getSessionAction, signOutAction, clearAuthToken } from '@repo/web/session';

// Get current session (server-side only)
const result = await getSessionAction();
// { ok: true, session: SessionResponse } | { ok: false, error: ApiErrorData }

// Sign out and clear cookie
await signOutAction();

// Clear auth token cookie
await clearAuthToken();
```

### Hooks (client-side)

```typescript
import { useSession, useSignOut } from '@repo/web/session';

// Read session state
const { session, principal, status, refresh } = useSession();

// Sign out
const { signOut, loading } = useSignOut();
```

### Components

```typescript
import { LogoutButton } from '@repo/web/session';

<LogoutButton label="خروج" />
```

### Token Helpers

```typescript
import { decodeJwtPayload, isTokenExpired } from '@repo/web/session';

decodeJwtPayload(token); // Record<string, unknown> | null
isTokenExpired(token, bufferSeconds = 30); // boolean
```

## Ownership Table

| Feature | Location |
|---------|----------|
| LoginForm, RegisterForm, ForgotForm | apps/frontend/src/core/features/auth/ |
| useSignIn, useSignUp | apps/frontend/src/core/features/auth/hook/ |
| signInApi, signUpApi | apps/frontend/src/core/features/auth/lib/auth-api.ts |
| Sign-in/sign-up form schemas | apps/frontend/src/core/features/auth/ |
| Session types, cookie helpers, token helpers | @repo/web/session |
| getSessionAction, signOutAction | @repo/web/session |
| useSession, useSignOut, LogoutButton | @repo/web/session |
| Middleware + layout guard | apps/web-business, apps/web-admin |

## Integration Pattern

### Middleware (web-business/web-admin)

```typescript
// apps/web-business/src/middleware.ts
import { NextResponse } from 'next/server';
import { isTokenExpired } from '@repo/web/session';

export function middleware(request) {
  const token = request.cookies.get('Token')?.value;
  if (!token || isTokenExpired(token)) {
    const loginUrl = new URL('/login', process.env.NEXT_PUBLIC_FRONTEND_URL);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}
```

### Layout Guard

```typescript
// apps/web-business/src/app/(panel)/layout.tsx
import { redirect } from 'next/navigation';
import { getSessionAction } from '@repo/web/session';

export default async function PanelLayout({ children }) {
  const result = await getSessionAction();
  if (!result.ok) {
    redirect(`${process.env.NEXT_PUBLIC_FRONTEND_URL}/login`);
  }
  return <PanelLayout account={result.session.principal}>{children}</PanelLayout>;
}
```

## Do / Don't Checklist

✅ Do: Redirect unauthenticated users to frontend login URL  
❌ Don't: Create LoginForm in web-business/web-admin  
✅ Do: Use getSessionAction for server-side session checks  
❌ Don't: Read httpOnly cookie from client JS  
✅ Do: Use useSignOut for logout in product apps  
❌ Don't: Implement useSignIn/useSignUp in product apps  

## Migration Notes

Old path → New path:
- `@/core/lib/coockie/getAccess` → `@repo/web/session` (getAccessTokenSSR)
- `@/core/lib/coockie/setCoockie` → Keep in frontend for setAuthToken
- `@/core/lib/token/token.ts` → `@repo/web/session`
- `@/core/features/auth/lib/auth-storage.ts` → `@repo/web/session` (getSessionAction, signOutAction, clearAuthToken)
- `@/core/features/auth/hook/useSession` → `@repo/web/session`
- `@/core/features/auth/hook/useSignOut` → `@repo/web/session`
