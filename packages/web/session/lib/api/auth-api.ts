import type { SessionResponse } from '../../assets/@types/session.types';
import { apiRequest } from '@repo/web/api';
import { parseSessionResponse } from './parsers';

function getApiBase(): string {
  const publicBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_BACK_URL;
  const base =
    typeof window === 'undefined' ? (process.env.INTERNAL_API_BASE_URL ?? publicBase) : publicBase;

  if (!base) {
    throw new Error('API base URL is not configured');
  }

  return `${base}/v1/auth`;
}

export async function getSessionApi(token: string): Promise<SessionResponse> {
  return apiRequest(`${getApiBase()}/session`, {
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
  await apiRequest(`${getApiBase()}/sign-out`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'void',
  });
}