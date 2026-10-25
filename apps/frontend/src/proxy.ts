import { isTokenExpired } from '@/core/lib/token/token';
import { NextResponse, type NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'Token';

/** مسیرهای عمومی (مسیر دقیق یا زیرمسیرها؛ "/" فقط دقیق). */
const PUBLIC_PATHS = [
  '/panel', // Static panel preview; no sign-in is required.
  '/login',
  '/register',
  '/forgot',
  '/terms',
  '/faq',
  '/about',
  '/contact',
  '/plans',
  '/customers',
];

/** صفحاتی که کاربر لاگین‌شده نباید ببیند. */
const GUEST_ONLY_PATHS = ['/login', '/register'];

const matches = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

/**
 * توکن بک‌اند یک bearer مات (base64url) است، نه JWT؛ انقضای آن را
 * maxAge کوکی (از expiresAt) و endpoint session کنترل می‌کند.
 * فقط اگر شکل JWT داشت، exp آن با isTokenExpired چک می‌شود.
 *
 * توجه: این فقط یک چک خوش‌بینانه‌ی «وجود کوکی» برای ریدایرکت است و اعتبار
 * توکن را تأیید نمی‌کند؛ محافظت واقعی با بک‌اند (Bearer) است.
 */
function hasUsableToken(token: string | undefined): boolean {
  if (!token) return false;
  if (token.split('.').length === 3) return !isTokenExpired(token);
  return true;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = hasUsableToken(request.cookies.get(AUTH_COOKIE_NAME)?.value);

  if (authed && GUEST_ONLY_PATHS.some((p) => matches(pathname, p))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const isPublic = pathname === '/' || PUBLIC_PATHS.some((p) => matches(pathname, p));

  if (!isPublic && !authed) {
    const res = NextResponse.redirect(new URL('/login', request.url));
    // کوکی منقضی/نامعتبر را پاک می‌کنیم
    if (request.cookies.has(AUTH_COOKIE_NAME)) res.cookies.delete(AUTH_COOKIE_NAME);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  // فایل‌های استاتیک، _next و /api از proxy رد می‌شوند
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|common|.*\\..*).*)'],
};
