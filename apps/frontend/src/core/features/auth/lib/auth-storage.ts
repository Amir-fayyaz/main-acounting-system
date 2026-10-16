"use server";
import { getAccessTokenSSR } from "@/core/lib/coockie/getAccess";
import { removeCoockie, setCoockie } from "@/core/lib/coockie/setCoockie";
import type {
  AuthApiError,
  SessionResponse,
} from "../assets/@types/auth.types";
import { getSessionApi, signOutApi } from "./auth-api";

const REMEMBER_MAX_AGE = 30 * 24 * 60 * 60; // ۳۰ روز
const FALLBACK_MAX_AGE = 15 * 60; // ۱۵ دقیقه

/** Server Action — cookie `Token` (httpOnly). remember فقط روی maxAge اثر دارد. */
export async function setAuthToken(
  token: string,
  expiresAt?: string,
  remember = false,
) {
  let maxAge = FALLBACK_MAX_AGE;
  if (remember) {
    maxAge = REMEMBER_MAX_AGE;
  } else if (expiresAt) {
    const seconds = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    if (Number.isFinite(seconds) && seconds > 0) maxAge = seconds;
  }
  await setCoockie(token, maxAge);
}

/** Server Action */
export async function clearAuthToken() {
  await removeCoockie();
}

export type SessionActionResult =
  | { ok: true; session: SessionResponse }
  | { ok: false; error: AuthApiError };

/**
 * چون cookie خاصیت httpOnly دارد، کلاینت نمی‌تواند آن را بخواند؛
 * session از طریق این Server Action با توکن cookie گرفته می‌شود.
 */
export async function getSessionAction(): Promise<SessionActionResult> {
  const token = await getAccessTokenSSR();
  if (!token) return { ok: false, error: { status: 401, body: null } };
  try {
    return { ok: true, session: await getSessionApi(token) };
  } catch (e) {
    return { ok: false, error: e as AuthApiError };
  }
}

/** sign-out سمت سرور (در صورت وجود توکن) + پاک‌کردن cookie. همیشه cookie پاک می‌شود. */
export async function signOutAction(): Promise<void> {
  const token = await getAccessTokenSSR();
  try {
    if (token) await signOutApi(token);
  } finally {
    await removeCoockie();
  }
}
