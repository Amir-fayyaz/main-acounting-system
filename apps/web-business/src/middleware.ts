import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isTokenExpired } from '@repo/web/session';

const PUBLIC_PATHS = ['/en', '/fa'];
const API_PATHS = ['/_next', '/api', '/static'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (API_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  const token = request.cookies.get('Token')?.value;
  
  if (!token) {
    return redirectToLogin(request);
  }
  
  if (isTokenExpired(token)) {
    return redirectToLogin(request);
  }
  
  return NextResponse.next();
}

function redirectToLogin(request: NextRequest) {
  const loginBaseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';
  const loginUrl = new URL('/login', loginBaseUrl);
  loginUrl.searchParams.set('next', request.nextUrl.origin + request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};