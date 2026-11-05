import type { PaginatedResponse } from '@repo/web';
import type { AuditEvent, ListParams } from '../assets/@types';
import { createMockAuditEvents } from '../assets/mock/organization';
import { filterMockRows, paginateMockRows, waitForMockResponse } from '../assets/mock/mock-utils';

const auditEvents = createMockAuditEvents();

export async function listAuditEvents(
  params: ListParams = {},
): Promise<PaginatedResponse<AuditEvent>> {
  const filtered = filterMockRows(auditEvents, params.search, (event) =>
    [event.actorName, event.action, event.target, event.result].join(' '),
  );
  return waitForMockResponse(paginateMockRows(filtered, params));
}
