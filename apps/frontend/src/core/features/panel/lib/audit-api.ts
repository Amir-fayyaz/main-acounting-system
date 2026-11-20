import type { PaginatedResponse } from '@repo/web';
import type { AuditEvent, ListParams } from '../assets/@types';
import { createMockAuditEvents } from '../assets/mock/organization';
import { auditResultLabel } from '../utils/status-label';
import { listMockRows } from './mock-api-utils';

const auditEvents = createMockAuditEvents();

export async function listAuditEvents(
  params: ListParams = {},
): Promise<PaginatedResponse<AuditEvent>> {
  return listMockRows(auditEvents, params, {
    getSearchText: (event) =>
      [
        event.actorName,
        event.action,
        event.target,
        event.result,
        event.occurredAt,
        auditResultLabel(event.result),
      ].join(' '),
    getStatus: (event) => event.result,
  });
}
