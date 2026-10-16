import { EntityId } from '../../../../shared/id/entity-id.js';

/**
 * The audit record's own identity (AUD-001; ADR-002 section 10).
 *
 * It is the shared {@link EntityId}: one UUID per record, generated once and
 * never reused. The alias is nominal only — it makes a record id read as a
 * record id at a call site without introducing a second identity mechanism —
 * and it keeps the audit record compatible with everything else that speaks in
 * `EntityId` (the persistence capabilities included).
 *
 * Two properties matter for an audit trail: the id is collision-free across
 * processes, so two concurrent writers can never produce one record where there
 * were two; and it discloses nothing about the record (how many exist, in which
 * order they came) to whoever sees it in a URL.
 *
 * The *action*, the *actor*, the *tenant* and the *time* are stored beside it
 * as separate fields rather than encoded into it, because an audit query has to
 * filter on those independently.
 */
export type AuditRecordId = EntityId;

/** Generates a fresh, globally unique audit record identity. */
export function generateAuditRecordId(): AuditRecordId {
  return EntityId.generate();
}

/** Wraps an existing audit record identity, e.g. one read from storage. */
export function auditRecordIdFrom(value: string): AuditRecordId {
  return EntityId.from(value);
}

/** Whether `value` is a well-formed audit record identity. */
export function isAuditRecordId(value: string): boolean {
  return EntityId.isValid(value);
}
