'use server';

import { removeCoockie, setCoockie } from '@/core/lib/coockie/setCoockie';
import { getAccessTokenSSR } from '@/core/lib/coockie/getAccess';
import { env } from 'process';
import { createHttpApiError, serializeApiError } from '@repo/web/api';
import type { SessionResponse } from '../assets/@types/auth.types';
import { getSessionApi, signOutApi } from './auth-api';

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
  return removeCoockie();
}

export type SessionActionResult =
  | { ok: true; session: SessionResponse }
  | { ok: false; error: ReturnType<typeof serializeApiError> };

export async function getSessionAction(): Promise<SessionActionResult> {
  const token = await getAccessTokenSSR();
  if (!token) return { ok: false, error: createHttpApiError(401).toData() };
  try {
    return { ok: true, session: await getSessionApi(token) };
  } catch (error: unknown) {
    return { ok: false, error: serializeApiError(error) };
  }
}

export async function signOutAction(): Promise<void> {
  const token = await getAccessTokenSSR();
  try {
    if (token) await signOutApi(token);
  } finally {
    await removeCoockie();
  }
}
