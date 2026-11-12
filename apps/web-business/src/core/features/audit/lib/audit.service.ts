import type { AuditEvent, ListAuditParams } from '../assets/@types/audit';
import { getMockAuditEvents } from '../assets/mock/audit.mock';

export const AUDIT_DEFAULT_LIMIT = 20;
export const AUDIT_MAX_LIMIT = 100;

export interface AuditListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuditListResponse {
  data: AuditEvent[];
  meta: AuditListMeta;
}

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isSafeInteger(limit) || limit < 1) {
    return AUDIT_DEFAULT_LIMIT;
  }
  return Math.min(limit, AUDIT_MAX_LIMIT);
}

function filterEvents(params: ListAuditParams): AuditEvent[] {
  const search = params.search?.trim().toLowerCase() ?? '';
  const outcome = params.outcome?.trim() ?? '';

  return getMockAuditEvents().filter((e) => {
    if (outcome && e.out !== outcome) return false;
    if (!search) return true;
    return [e.at, e.who, e.action, e.target, e.out].join(' ').toLowerCase().includes(search);
  });
}

export async function listAudit(params: ListAuditParams = {}): Promise<AuditListResponse> {
  const limit = normalizeLimit(params.limit);
  const requestedPage =
    Number.isSafeInteger(params.page) && (params.page ?? 0) >= 1 ? (params.page as number) : 1;
  const filtered = filterEvents(params);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * limit;
  return { data: filtered.slice(start, start + limit), meta: { page, limit, total, totalPages } };
}
