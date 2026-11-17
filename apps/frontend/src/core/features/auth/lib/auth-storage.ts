'use server';

import { setCoockie } from '@/core/lib/coockie/setCoockie';
import { env } from 'process';
import { clearAuthToken as clearAuthTokenShared, getSessionAction as getSessionActionShared, signOutAction as signOutActionShared } from '@repo/web/session';

const REMEMBER_MAX_AGE = 30 * 24 * 60 * 60;
const FALLBACK_MAX_AGE = (Number(env.AUTH_SESSION_TTL_MINUTES) || 60) * 60;

export async function setAuthToken(token: string, expiresAt?: string, remember = false) {
  let maxAge = FALLBACK_MAX_AGE;
  if (remember) {
    maxAge = REMEMBER_MAX_AGE;
  } else if (expiresAt) {
    const seconds = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    if (Number.isFinite(seconds) && seconds > 0) maxAge = seconds;
  }
  await setCoockie(token, maxAge);
}

export async function clearAuthToken() {
  return clearAuthTokenShared();
}

export { getSessionActionShared as getSessionAction, signOutActionShared as signOutAction };
