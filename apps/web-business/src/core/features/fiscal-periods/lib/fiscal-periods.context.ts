import { createHttpApiError, serializeApiError, type ApiErrorData } from '@repo/web/api';
import { getAccessTokenSSR } from '@repo/web/session/cookie';
import { getSessionAction } from '@repo/web/session/storage';

import { fetchActiveTenantIds } from './fiscal-periods.requests';

export interface FiscalRequestContext {
  readonly token: string;
  readonly tenantId: string;
}

export type FiscalContextResult =
  | { readonly ok: true; readonly context: FiscalRequestContext }
  | { readonly ok: false; readonly error: ApiErrorData };

export async function resolveFiscalContext(): Promise<FiscalContextResult> {
  const token = await getAccessTokenSSR();
  if (!token) return { ok: false, error: createHttpApiError(401).toData() };

  const sessionResult = await getSessionAction();
  if (!sessionResult.ok) return { ok: false, error: sessionResult.error };

  try {
    const tenantIds = await fetchActiveTenantIds(token, sessionResult.session.principal.userId);
    const [tenantId] = tenantIds;
    if (!tenantId) return { ok: false, error: createHttpApiError(403).toData() };

    return { ok: true, context: { token, tenantId } };
  } catch (error: unknown) {
    return { ok: false, error: serializeApiError(error) };
  }
}
