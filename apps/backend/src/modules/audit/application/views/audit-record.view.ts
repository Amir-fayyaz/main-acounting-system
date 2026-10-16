import type { AuditActorType } from '../../domain/value-objects/audit-actor.js';
import type { AuditMetadata } from '../../domain/value-objects/audit-metadata.js';
import type { AuditOutcomeValue } from '../../domain/value-objects/audit-outcome.js';

/**
 * The application-level representation of an audit record (AUD-001).
 *
 * This is a *view*, not the aggregate: plain, serializable values a use case
 * can return and the presentation layer can map to a DTO. Handing out the
 * aggregate instead would be meaningless here — an audit record has no
 * mutation to protect — but the separation still matters, because it keeps the
 * read shape stable when the record's internals change and keeps callers from
 * depending on a domain object (ADR-003, section 16).
 *
 * Every field is exactly what the trail has to answer: who (`actorType`,
 * `actorUserId`), for which company (`tenantId`), what (`action`), on what
 * (`targetType`, `targetId`), when (`occurredAt`), with what result
 * (`outcome`) and how it is tied to its flow (`correlationId`, `causationId`).
 * `metadata` is the sanitized context the record was written with — already
 * free of credential material, because it was sanitized before persistence.
 */
export interface AuditRecordView {
  /** The record's stable identity. */
  readonly id: string;
  /** The tenant the fact belongs to; absent for platform-level facts. */
  readonly tenantId?: string;
  /** Whether a user acted or the system itself did. */
  readonly actorType: AuditActorType;
  /** The acting user's identity; absent exactly when `actorType` is `system`. */
  readonly actorUserId?: string;
  /** The stable action name, e.g. `user.signed_in`. */
  readonly action: string;
  /** The kind of resource the operation addressed, when it addressed one. */
  readonly targetType?: string;
  /** The identity of that resource, when the operation addressed one. */
  readonly targetId?: string;
  /** How the operation ended. */
  readonly outcome: AuditOutcomeValue;
  /** When it happened, ISO-8601 in UTC. */
  readonly occurredAt: string;
  /** The flow the fact belongs to, when it is known. */
  readonly correlationId?: string;
  /** The direct cause of the fact, when it is known. */
  readonly causationId?: string;
  /** The sanitized context; never credential material. */
  readonly metadata: AuditMetadata;
}
