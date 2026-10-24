import type { AuditRecord } from '../../domain/aggregates/audit-record.js';
import type { AuditRecordView } from './audit-record.view.js';

/**
 * Maps a stored record to the application view (AUD-001).
 *
 * The mapping is one-way and total: it reads the record and produces plain
 * values. Nothing here can write back into a record — an audit fact is
 * immutable, and this mapper is not a place where that could change.
 *
 * Times are emitted as ISO-8601 UTC instants, the FND-006 date-time format, so
 * a reader never has to know how the instant is stored.
 */
export function toAuditRecordView(record: AuditRecord): AuditRecordView {
  return {
    id: record.id.value,
    ...(record.tenantId === undefined ? {} : { tenantId: record.tenantId }),
    actorType: record.actor.type,
    ...(record.actor.userId === undefined ? {} : { actorUserId: record.actor.userId }),
    action: record.action.value,
    ...(record.target === undefined
      ? {}
      : { targetType: record.target.type, targetId: record.target.id }),
    outcome: record.outcome.value,
    occurredAt: record.occurredAt.toIsoString(),
    ...(record.correlationId === undefined ? {} : { correlationId: record.correlationId }),
    ...(record.causationId === undefined ? {} : { causationId: record.causationId }),
    metadata: record.metadata,
  };
}
