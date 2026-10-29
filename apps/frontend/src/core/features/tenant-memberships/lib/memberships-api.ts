'use server';

import { getAccessTokenSSR } from '@/core/lib/coockie/getAccess';

import type {
  MembershipsResponse,
  TenantMembershipsResult,
} from '../assets/@types/membership.types';

const GENERIC_ERROR =
  'دریافت اعضای مجموعه با خطا مواجه شد. لطفاً دوباره تلاش کنید.';

type ApiErrorPayload = {
  error?: {
    message?: string;
    correlationId?: string;
  };
};

function getApiBaseUrl(): string | null {
  const baseUrl =
    process.env.INTERNAL_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_BACK_URL;

  return baseUrl?.replace(/\/+$/, '') || null;
}

/**
 * Server-only fetch for tenant memberships.
 * Sends only `page` and `limit` — never `search` (API rejects it).
 */
export async function getTenantMemberships(
  tenantId: string,
  page: number,
  limit: number,
): Promise<TenantMembershipsResult> {
  const token = await getAccessTokenSSR();

  if (!token) {
    return {
      ok: false,
      message: 'برای مشاهده اعضا ابتدا وارد حساب کاربری شوید.',
    };
  }

  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      message: 'نشانی API در تنظیمات پروژه مشخص نشده است.',
    };
  }

  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  try {
    const response = await fetch(
      `${baseUrl}/v1/tenants/${encodeURIComponent(tenantId)}/memberships?${query}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | ApiErrorPayload
        | null;
      const message =
        typeof payload?.error?.message === 'string'
          ? payload.error.message
          : GENERIC_ERROR;
      const correlationId =
        typeof payload?.error?.correlationId === 'string'
          ? payload.error.correlationId
          : undefined;

      return {
        ok: false,
        message,
        ...(correlationId ? { correlationId } : {}),
      };
    }

    const payload = (await response.json()) as MembershipsResponse;
    if (!Array.isArray(payload.data) || !payload.meta) {
      return { ok: false, message: GENERIC_ERROR };
    }

    return { ok: true, result: payload };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
}
