import type {
  AuditEntry,
  AuditRecorder,
} from '../../src/modules/audit/application/ports/audit-recorder.port.js';
import type {
  AuditRecordCriteria,
  AuditRecordPage,
  AuditRecordQuery,
} from '../../src/modules/audit/application/ports/audit-record-query.port.js';
import { toAuditRecordView } from '../../src/modules/audit/application/views/audit-record.mapper.js';
import type { AuditRecordView } from '../../src/modules/audit/application/views/audit-record.view.js';
import { AuditRecord } from '../../src/modules/audit/domain/aggregates/audit-record.js';
import type { AuditRecordRepository } from '../../src/modules/audit/domain/repositories/audit-record.repository.js';
import { AuditActor } from '../../src/modules/audit/domain/value-objects/audit-actor.js';
import { AuditAction } from '../../src/modules/audit/domain/value-objects/audit-action.js';
import { AuditOutcome } from '../../src/modules/audit/domain/value-objects/audit-outcome.js';
import type { AuditOutcomeValue } from '../../src/modules/audit/domain/value-objects/audit-outcome.js';
import { AuditTarget } from '../../src/modules/audit/domain/value-objects/audit-target.js';
import { auditRecordIdFrom } from '../../src/modules/audit/domain/value-objects/audit-record-id.js';
import type { WriteReceipt } from '../../src/shared/persistence/repository-ports.js';
import { Revision } from '../../src/shared/persistence/revision.js';
import { DateTime } from '../../src/shared/time/date-time.js';

/**
 * Test doubles for the Audit capability (AUD-001).
 *
 * They implement the module's own ports — the write port and the read port —
 * never a Drizzle adapter, so the application tests run without a database
 * while still exercising the real record, the real sanitizer and the real use
 * cases. Two of them matter beyond this module:
 *
 * - {@link RecordingAuditTrail} is the `AuditRecorder` every *other* module's
 *   test injects, which is how a consumer spec (identity authentication and
 *   authorization) can assert what a security flow recorded without pulling in
 *   the audit table.
 * - {@link InMemoryAuditRecordQuery} reproduces the read adapter's semantics —
 *   tenant scope, filters, newest-first order, page slice, filtered total — so
 *   an HTTP-level test can drive the real controller and the real use case
 *   without MySQL. The real adapter is pinned separately by the MySQL
 *   integration spec, so neither stands in for the other.
 */

/** Records every audit entry a consumer states, in order. */
export class RecordingAuditTrail implements AuditRecorder {
  public readonly recorded: AuditEntry[] = [];

  /** Every recorded action name, for concise assertions. */
  public actions(): readonly string[] {
    return this.recorded.map((entry) => entry.action);
  }

  /** The single entry recorded for `action`, or `undefined`. */
  public find(action: string): AuditEntry | undefined {
    return this.recorded.find((entry) => entry.action === action);
  }

  public async record(entry: AuditEntry): Promise<void> {
    this.recorded.push(entry);
  }
}

/** In-memory `AuditRecordRepository`: append-only, exactly like the real port. */
export class InMemoryAuditRecordRepository implements AuditRecordRepository {
  private readonly records = new Map<string, AuditRecord>();

  public addCalls = 0;

  /** The stored records, in insertion order. */
  public stored(): readonly AuditRecord[] {
    return [...this.records.values()];
  }

  public async add(record: AuditRecord): Promise<WriteReceipt> {
    this.addCalls += 1;
    this.records.set(record.id.value, record);

    return { revision: Revision.initial() };
  }
}

/** In-memory `AuditRecordQuery`, with the read adapter's filtering and ordering. */
export class InMemoryAuditRecordQuery implements AuditRecordQuery {
  private readonly records: AuditRecordView[] = [];

  /** Seeds a plain view (the read side accepts data, not aggregates). */
  public seed(view: AuditRecordView): void {
    this.records.push(view);
  }

  /** Seeds a domain record through the real view mapper. */
  public seedRecord(record: AuditRecord): void {
    this.seed(toAuditRecordView(record));
  }

  public async read(criteria: AuditRecordCriteria): Promise<AuditRecordPage> {
    const matching = this.records
      .filter((record) => record.tenantId === criteria.tenantId)
      .filter(
        (record) =>
          criteria.actorUserId === undefined || record.actorUserId === criteria.actorUserId,
      )
      .filter((record) => criteria.action === undefined || record.action === criteria.action)
      .filter(
        (record) => criteria.targetType === undefined || record.targetType === criteria.targetType,
      )
      .filter((record) => criteria.targetId === undefined || record.targetId === criteria.targetId)
      .filter((record) => criteria.outcome === undefined || record.outcome === criteria.outcome)
      .filter(
        (record) =>
          criteria.from === undefined || Date.parse(record.occurredAt) >= criteria.from.epochMillis,
      )
      .filter(
        (record) =>
          criteria.to === undefined || Date.parse(record.occurredAt) <= criteria.to.epochMillis,
      )
      .sort((left, right) => {
        const byTime = Date.parse(right.occurredAt) - Date.parse(left.occurredAt);
        if (byTime !== 0) return byTime;

        return right.id.localeCompare(left.id);
      });

    const start = (criteria.page - 1) * criteria.limit;

    return {
      records: matching.slice(start, start + criteria.limit),
      total: matching.length,
    };
  }
}

/** What {@link anAuditRecord} lets a test override. */
export interface AuditRecordOverrides {
  readonly id?: string;
  readonly tenantId?: string;
  readonly actorUserId?: string;
  readonly systemActor?: boolean;
  readonly action?: string;
  readonly targetType?: string;
  readonly targetId?: string;
  readonly outcome?: AuditOutcomeValue;
  readonly occurredAt?: DateTime;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly metadata?: unknown;
}

/** Builds a domain record for seeding, with fixed, predictable values. */
export function anAuditRecord(overrides: AuditRecordOverrides = {}): AuditRecord {
  const tenantId = overrides.tenantId;
  const actorUserId =
    overrides.systemActor === true ? undefined : (overrides.actorUserId ?? 'user-1');
  const targetType = overrides.targetType;
  const targetId = overrides.targetId;

  return AuditRecord.create({
    ...(overrides.id === undefined ? {} : { id: auditRecordIdFrom(overrides.id) }),
    action: AuditAction.from(overrides.action ?? 'user.signed_in'),
    outcome: AuditOutcome.from(overrides.outcome ?? 'success'),
    actor: actorUserId === undefined ? AuditActor.system() : AuditActor.user(actorUserId),
    occurredAt: overrides.occurredAt ?? DateTime.parse('2026-10-16T09:00:00.000Z'),
    ...(tenantId === undefined ? {} : { tenantId }),
    ...(targetType === undefined || targetId === undefined
      ? {}
      : { target: AuditTarget.of(targetType, targetId) }),
    ...(overrides.correlationId === undefined ? {} : { correlationId: overrides.correlationId }),
    ...(overrides.causationId === undefined ? {} : { causationId: overrides.causationId }),
    ...(overrides.metadata === undefined ? {} : { metadata: overrides.metadata }),
  });
}
