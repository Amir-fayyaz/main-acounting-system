/**
 * Injection tokens for the Audit module (AUD-001).
 *
 * The two tokens name the module's two published contracts, so a consumer
 * depends on the contract and never on the use case, the adapter or the table
 * behind it (ADR-002, section 15).
 */

/**
 * The audit contract other modules record through (`AuditRecorder`) — the
 * `Business Module → Audit Contract → Audit Module` boundary of ADR-003,
 * section 21. Available application-wide, because every module records facts.
 */
export const AUDIT_RECORDER = Symbol('AUDIT_RECORDER');

/**
 * The audit read boundary (`AuditRecordQuery`). Private to this module: the
 * trail is read through the authorized retrieval use case, not by a module
 * reaching for the port itself.
 */
export const AUDIT_RECORD_QUERY = Symbol('AUDIT_RECORD_QUERY');

/**
 * The audit persistence port (`AuditRecordRepository`). Private to this module:
 * nothing outside it writes to, or reads from, the audit table directly — other
 * modules use `AUDIT_RECORDER` (ADR-003 section 21).
 */
export const AUDIT_RECORD_REPOSITORY = Symbol('AUDIT_RECORD_REPOSITORY');
