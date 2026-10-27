import { ActorScope } from '../../../../shared/actor/actor-scope.js';
import type { DomainEvent } from '../../../../shared/messaging/domain-event.js';
import type { TenantEventRecorder } from '../../../tenant/public-api.js';
import type {
  AuditEntry,
  AuditRecorder,
} from '../../application/ports/audit-recorder.port.js';

/**
 * Sends the tenant module's facts to the outbox **and** to the central audit
 * trail (IAM-009; AUD-001; ADR-003 section 21; ADR-010 section 9).
 *
 * The adapter lives in the audit module, not in tenant, because the decision
 * made here is an audit decision: tenant publishes one recorder contract for its
 * events, and the module that owns the audit trail decides which of those facts
 * are security-relevant. That keeps tenant a leaf — it never imports the audit
 * module — while the audit module consumes only tenant's published contract
 * (ADR-002 section 12).
 *
 * The module keeps one recorder port for its events. This adapter is the one
 * place that decides which of those facts are security-relevant:
 *
 * ```text
 * TenantCreated        → company.created         success
 * TenantProfileUpdated → company.updated         success
 * TenantStatusChanged  → company.status_changed  success
 * ```
 *
 * Every fact is still written to the outbox first, so the rest of the system
 * learns it in the same transaction. The audit record is the durable evidence
 * of the change, not a second event mechanism.
 *
 * An unrecognised event throws rather than being silently forwarded, so a new
 * tenant fact cannot disappear from the security trail merely because nobody
 * classified it (ADR-010 section 13).
 *
 * The actor is never taken from the event: it is the ambient authenticated
 * principal the HTTP boundary established, resolved by the audit recorder.
 */
export class TenantAuditEventRecorder implements TenantEventRecorder {
  public constructor(
    private readonly outbox: TenantEventRecorder,
    private readonly audit: AuditRecorder,
  ) {}

  public async record(event: DomainEvent<unknown>): Promise<void> {
    const entry = classifyTenantEvent(event);

    await this.outbox.record(event);
    await this.audit.record(entry);
  }
}

/**
 * Maps one tenant event to its audit entry.
 *
 * @throws Error — the event is not one this adapter has classified.
 */
export function classifyTenantEvent(event: DomainEvent<unknown>): AuditEntry {
  const actor = ActorScope.current();
  const actorFields = actor === undefined ? {} : { actorUserId: actor.userId };

  switch (event.name) {
    case 'TenantCreated': {
      const data = as<{ readonly tenantId: string; readonly name: string }>(event);
      return {
        action: 'company.created',
        outcome: 'success',
        ...actorFields,
        target: { type: 'tenant', id: data.tenantId },
        metadata: { name: data.name },
        causationId: event.metadata.messageId,
      };
    }
    case 'TenantProfileUpdated': {
      const data = as<{ readonly tenantId: string; readonly name: string }>(event);
      return {
        action: 'company.updated',
        outcome: 'success',
        ...actorFields,
        target: { type: 'tenant', id: data.tenantId },
        metadata: { name: data.name },
        causationId: event.metadata.messageId,
      };
    }
    case 'TenantStatusChanged': {
      const data = as<{
        readonly tenantId: string;
        readonly from: string;
        readonly to: string;
      }>(event);
      return {
        action: 'company.status_changed',
        outcome: 'success',
        ...actorFields,
        target: { type: 'tenant', id: data.tenantId },
        metadata: { from: data.from, to: data.to },
        causationId: event.metadata.messageId,
      };
    }
    default:
      throw new Error(
        `TenantAuditEventRecorder: no audit decision for event "${event.name}". ` +
          'Classify it or add a forwarding rule.',
      );
  }
}

/** Reads an event's body as the shape this adapter knows it carries. */
function as<T>(event: DomainEvent<unknown>): T {
  return event.data as T;
}
