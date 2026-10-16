import { Revision } from '../../../../shared/persistence/revision.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { AuditRecord } from '../../domain/aggregates/audit-record.js';
import {
  type AuditMetadata,
  sanitizeAuditMetadata,
} from '../../domain/value-objects/audit-metadata.js';
import { auditRecords } from './audit-record.schema.js';

type AuditRow = typeof auditRecords.$inferSelect;
type NewAuditRow = typeof auditRecords.$inferInsert;

/**
 * The audit table's row mapping (AUD-001; ADR-003 section 16).
 *
 * Domain record and persistence model are kept apart, and meet only here: a
 * change to a column cannot change an audit rule, and a rule about what a
 * record may contain cannot be re-decided by the schema. Both directions are
 * total and explicit, so nothing about a fact is lost or invented in transit.
 *
 * Two details are deliberate:
 *
 * - **An absent optional field is stored as SQL `NULL`, and `NULL` reads back
 *   as an absent field.** A platform-level record has no tenant because there
 *   is no tenant, not because a value went missing, and an empty string would
 *   blur exactly that distinction.
 * - **Metadata crosses the boundary as JSON text, and is rebuilt as data.**
 *   Writing uses one `JSON.stringify` of the already-sanitized context; reading
 *   parses it back and hands the result to the domain, which re-sanitizes it. A
 *   row written by an older rule, or by something other than this adapter, still
 *   cannot carry credential material into the domain.
 */

/** Converts a stored row into the domain record, re-validating every value. */
export function toAuditRecord(row: AuditRow): AuditRecord {
  return AuditRecord.rehydrate({
    id: row.id,
    ...(row.tenantId === null ? {} : { tenantId: row.tenantId }),
    actorType: row.actorType,
    ...(row.actorUserId === null ? {} : { actorUserId: row.actorUserId }),
    action: row.action,
    ...(row.targetType === null || row.targetId === null
      ? {}
      : { targetType: row.targetType, targetId: row.targetId }),
    outcome: row.outcome,
    occurredAt: DateTime.from(row.occurredAt),
    ...(row.correlationId === null ? {} : { correlationId: row.correlationId }),
    ...(row.causationId === null ? {} : { causationId: row.causationId }),
    metadata: readMetadata(row.metadata),
  });
}

/**
 * Converts a domain record into the row to store.
 *
 * `revision` is always the initial revision: an audit record is written once and
 * never changed, so the shared write capability's compare-and-swap has nothing
 * to do here — the column exists because the module's port composes that
 * capability, which is what makes the write answer with a receipt (SHR-004).
 */
export function toNewAuditRow(record: AuditRecord): NewAuditRow {
  const snapshot = record.snapshot();

  return {
    id: snapshot.id,
    tenantId: snapshot.tenantId ?? null,
    actorType: snapshot.actorType,
    actorUserId: snapshot.actorUserId ?? null,
    action: snapshot.action,
    targetType: snapshot.targetType ?? null,
    targetId: snapshot.targetId ?? null,
    outcome: snapshot.outcome,
    occurredAt: snapshot.occurredAt.toDate(),
    correlationId: snapshot.correlationId ?? null,
    causationId: snapshot.causationId ?? null,
    metadata: JSON.stringify(snapshot.metadata),
    revision: Revision.initial().value,
  };
}

/**
 * Reads stored metadata back as data.
 *
 * Unreadable text (a row that is not JSON at all) yields an empty context rather
 * than an exception: the trail's own columns are the record, and failing a
 * retrieval because one row's optional context is corrupt would hide the very
 * facts an operator needs. The value is re-sanitized by the domain afterwards,
 * so nothing unreadable or sensitive reaches a caller.
 */
export function readMetadata(value: string | null): AuditMetadata {
  if (value === null) {
    return Object.freeze({});
  }

  try {
    return sanitizeAuditMetadata(JSON.parse(value) as unknown);
  } catch {
    return Object.freeze({});
  }
}
