import { BASE_URL } from '@/core/lib/basic-link/BackendBasicLink';
import type {
  SessionResponse,
  SignInInput,
  SignInResponse,
  SignUpInput,
  SignUpResponse,
} from '../assets/@types/auth.types';
import { env } from 'process';

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
  return `${base}/v1/auth`;
}

async function failure(res: Response) {
  const data = await res.json().catch(() => null);
  return { status: res.status, body: data };
}

export async function signUpApi(body: SignUpInput): Promise<SignUpResponse> {
  const res = await fetch(`${authPrefix()}/sign-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await failure(res);
  return res.json();
}

export async function signInApi(body: SignInInput): Promise<SignInResponse> {
  const res = await fetch(`${authPrefix()}/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await failure(res);
  return res.json();
}

export async function getSessionApi(token: string): Promise<SessionResponse> {
  const res = await fetch(`${authPrefix()}/session`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!res.ok) throw await failure(res);
  return res.json();
}

export async function signOutApi(token: string): Promise<void> {
  const res = await fetch(`${authPrefix()}/sign-out`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw await failure(res);
}
