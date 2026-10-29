'use server';

import { getAccessTokenSSR } from '@/core/lib/coockie/getAccess';

export type TenantMember = {
  membershipId: string;
  status: string;
  userId: string;
  displayName: string;
  email: string;
  userStatus: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
};

export type MembershipsMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type MembershipsResponse = {
  data: TenantMember[];
  meta: MembershipsMeta;
};

type ApiErrorPayload = {
  error?: {
    message?: string;
    correlationId?: string;
  };
};

export type TenantMembershipsResult =
  | { ok: true; result: MembershipsResponse }
  | { ok: false; message: string; correlationId?: string };

const GENERIC_ERROR =
  'دریافت اعضای مجموعه با خطا مواجه شد. لطفاً دوباره تلاش کنید.';

function getApiBaseUrl(): string | null {
  const baseUrl =
    process.env.INTERNAL_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_BACK_URL;

  return baseUrl?.replace(/\/+$/, '') || null;
}

/**
 * Reads the existing access token on the server and fetches one server-paginated
 * page. The token is never returned to the client.
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
      `${baseUrl}/v1/tenants/${encodeURIComponent(tenantId)}/memberships?${query.toString()}`,
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

    if (
      !Array.isArray(payload.data) ||
      !payload.meta ||
      typeof payload.meta.page !== 'number' ||
      typeof payload.meta.limit !== 'number' ||
      typeof payload.meta.total !== 'number' ||
      typeof payload.meta.totalPages !== 'number'
    ) {
      return { ok: false, message: GENERIC_ERROR };
    }

    return { ok: true, result: payload };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
}
