'use server';

import { cookies } from 'next/headers';
import { env } from 'process';

const AUTH_COOKIE_NAME = 'Token';
const FALLBACK_MAX_AGE = 15 * 60; // ثانیه

/**
 * ست‌کردن cookie توکن (نام یکدست: `Token`).
 * اگر maxAge داده نشود، فرصت‌ها به ترتیب: ۱۵ دقیقه (fallback).
 */
export async function setCoockie(access_token: string, maxAge?: number) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: AUTH_COOKIE_NAME,
    value: access_token,
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAge && maxAge > 0 ? maxAge : FALLBACK_MAX_AGE,
  });
  return { success: true };
}

export async function removeCoockie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  return { success: true };
}
