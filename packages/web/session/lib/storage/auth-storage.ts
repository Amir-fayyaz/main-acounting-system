'use server';

import { getAccessTokenSSR } from '../cookie';
import { removeCookie, setCookie } from '../cookie';
import { createHttpApiError, serializeApiError, type ApiErrorData } from '@repo/web/api';
import type { SessionResponse } from '../../assets/@types/session.types';
import { getSessionApi, signOutApi } from '../api';

const REMEMBER_MAX_AGE = 30 * 24 * 60 * 60;
const FALLBACK_MAX_AGE = (Number(process.env.AUTH_SESSION_TTL_MINUTES) || 60) * 60;

export async function setAuthToken(token: string, expiresAt?: string, remember = false) {
  let maxAge = FALLBACK_MAX_AGE;
  if (remember) {
    maxAge = REMEMBER_MAX_AGE;
  } else if (expiresAt) {
    const seconds = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    if (Number.isFinite(seconds) && seconds > 0) maxAge = seconds;
  }
  await setCookie(token, maxAge);
}

export async function clearAuthToken() {
  await removeCookie();
}

export type SessionActionResult =
  | { ok: true; session: SessionResponse }
  | { ok: false; error: ApiErrorData };

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
    await removeCookie();
  }
}