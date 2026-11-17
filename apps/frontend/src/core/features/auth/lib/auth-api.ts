import type {
  SessionResponse,
  SignInInput,
  SignInResponse,
  SignUpInput,
  SignUpResponse,
} from '../assets/@types/auth.types';
import { apiRequest } from '@repo/web/api';
import { env } from '@/core/lib/basic-link/env';
import { BASE_URL } from '@/core/lib/basic-link/BackendBasicLink';
import {
  parseSessionResponse,
  parseSignInResponse,
  parseSignUpResponse,
} from './auth-response-parsers';
/**
 * آدرس پایه طبق قرارداد infra پروژه:
 * - مرورگر: NEXT_PUBLIC_API_BASE_URL (مثلاً http://localhost:3000/api)
 * - سمت سرور (server action داخل Docker): INTERNAL_API_BASE_URL (http://backend:3000/api)
 * NEXT_PUBLIC_BACK_URL (BASE_URL قدیمی) فقط fallback است.
 */
function authPrefix(): string {
  const publicBase = env.NEXT_PUBLIC_API_BASE_URL ?? BASE_URL;

  const base =
    typeof window === 'undefined' ? (env.INTERNAL_API_BASE_URL ?? publicBase) : publicBase;

  if (!base) {
    throw new Error('API base URL is not configured');
  }

  return `${base}/v1/auth`;
}

export async function signUpApi(body: SignUpInput): Promise<SignUpResponse> {
  return apiRequest(`${authPrefix()}/sign-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    parse: parseSignUpResponse,
  });
}

export async function signInApi(body: SignInInput): Promise<SignInResponse> {
  return apiRequest(`${authPrefix()}/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    parse: parseSignInResponse,
  });
}

export async function getSessionApi(token: string): Promise<SessionResponse> {
  return apiRequest(`${authPrefix()}/session`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
    parse: parseSessionResponse,
  });
}

export async function signOutApi(token: string): Promise<void> {
  await apiRequest(`${authPrefix()}/sign-out`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'void',
  });
}
