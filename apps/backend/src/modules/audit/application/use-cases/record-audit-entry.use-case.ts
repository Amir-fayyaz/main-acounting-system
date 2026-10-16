import { ActorScope } from '../../../../shared/actor/actor-scope.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import { AuditRecord } from '../../domain/aggregates/audit-record.js';
import type { AuditRecordRepository } from '../../domain/repositories/audit-record.repository.js';
import { AuditAction } from '../../domain/value-objects/audit-action.js';
import { AuditActor } from '../../domain/value-objects/audit-actor.js';
import { AuditOutcome } from '../../domain/value-objects/audit-outcome.js';
import { AuditTarget } from '../../domain/value-objects/audit-target.js';
import type { AuditEntry, AuditRecorder } from '../ports/audit-recorder.port.js';

/**
 * Builds and stores audit records — the implementation of the published
 * `AuditRecorder` contract (AUD-001; ADR-003 section 21; SHR-004; SHR-005).
 *
 * It is the only write path into the audit trail, and it owns the three
 * decisions a consuming module must not make for itself:
 *
 * 1. **Which tenant a fact belongs to.** The tenant is read from the ambient
 *    tenant scope (SHR-007) — never from the entry — so a caller cannot file a
 *    fact under a company it does not run in. A caller with no scope writes a
 *    platform-level fact, which is the honest answer for a fact that belongs to
 *    no company (a sign-in, a denial before a scope exists).
 * 2. **Who the actor is.** An explicit `actorUserId` wins; otherwise the
 *    ambient actor scope supplies the authenticated principal of the current
 *    request. With neither, the fact is recorded as the *system* acting — a
 *    statement in its own right, kept apart from "the actor could not be
 *    determined".
 * 3. **Which transaction it commits with.** `boundary.execute(...)` joins the
 *    caller's open boundary, so an auditable business change and its audit
 *    record commit together or not at all; outside one it opens a short
 *    transaction of its own, so a fact that changed no state is still durable.
 *
 * Nothing here interprets the action name or the target: the module that stated
 * the fact owns its vocabulary, and the Audit capability stores it without
 * learning a single business rule (ADR-002, section 11).
 *
 * Reading the trail is a different question with a different audience, so it
 * lives on the read port (`AuditRecordQuery`) behind its own use case — this
 * class only writes, and its port exposes no read, no update and no delete.
 */
export class RecordAuditEntryUseCase implements AuditRecorder {
  public constructor(
    private readonly records: AuditRecordRepository,
    private readonly boundary: TransactionBoundary,
  ) {}

  /**
   * Stores one fact.
   *
   * @throws InvalidPrimitiveError — the action name, outcome, target or an
   * identifier is malformed. That is a bug in the caller that stated the fact,
   * so it surfaces here rather than being stored as an unqueryable record.
   */
  public async record(entry: AuditEntry): Promise<void> {
    const record = this.toRecord(entry);

    await this.boundary.execute(async () => {
      await this.records.add(record);
    });
  }

  /** Turns a stated entry into the domain record, resolving tenant and actor. */
  private toRecord(entry: AuditEntry): AuditRecord {
    const tenant = TenantScope.current();
    const actorUserId = entry.actorUserId ?? ActorScope.current()?.userId;

    return AuditRecord.create({
      action: AuditAction.from(entry.action),
      outcome: AuditOutcome.parse(entry.outcome),
      actor: actorUserId === undefined ? AuditActor.system() : AuditActor.user(actorUserId),
      occurredAt: entry.occurredAt === undefined ? DateTime.now() : DateTime.from(entry.occurredAt),
      ...(tenant.state === 'available' ? { tenantId: tenant.tenantId } : {}),
      ...(entry.target === undefined
        ? {}
        : { target: AuditTarget.of(entry.target.type, entry.target.id) }),
      ...(entry.correlationId === undefined ? {} : { correlationId: entry.correlationId }),
      ...(entry.causationId === undefined ? {} : { causationId: entry.causationId }),
      ...(entry.metadata === undefined ? {} : { metadata: entry.metadata }),
    });
  }
}
