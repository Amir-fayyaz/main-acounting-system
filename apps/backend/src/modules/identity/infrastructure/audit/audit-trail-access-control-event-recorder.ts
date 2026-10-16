import { Injectable } from '@nestjs/common';

import { ActorScope } from '../../../../shared/actor/actor-scope.js';
import type { DomainEvent } from '../../../../shared/messaging/domain-event.js';
import type {
  AuditEntry,
  AuditRecorder,
} from '../../../audit/application/ports/audit-recorder.port.js';
import type { RoleEventRecorder as RoleEventRecorderPort } from '../../application/ports/role-event-recorder.port.js';

/**
 * Translates the identity module's access-control events into audit records
 * (AUD-001; ADR-003 section 21; ADR-010 section 9).
 *
 * Identity keeps no audit mechanism of its own. Its use cases state each fact
 * as an ordinary domain event through the port they already depend on, and this
 * adapter is the one place that decides what reaches the central Audit
 * capability — and what does not:
 *
 * ```text
 * RolePermissionGranted   → role.permission_granted   success
 * RolePermissionRevoked   → role.permission_revoked   success
 * RoleAssigned            → role.assigned             success
 * RoleUnassigned          → role.unassigned           success
 * RoleStatusChanged       → role.status_changed       success
 * MembershipCreated       → membership.created        success
 * MembershipStatusChanged → membership.changed        success
 * UserStatusChanged       → user.status_changed       success
 * ```
 *
 * Three properties are the point:
 *
 * - **Every event has an explicit decision.** Sensitive access-control changes
 *   are audited; benign facts (a role's name, a profile edit) are forwarded to
 *   their documented home, the outbox, without an audit record; and an event
 *   this adapter does not recognise **throws** rather than being dropped, so a
 *   new fact cannot silently disappear from the security trail (ADR-010
 *   section 13).
 * - **The outbox still owns everything.** An audited fact is written to the
 *   outbox *and* to the audit trail, in that order, so neither home is a second
 *   mechanism for the other: the outbox is how the rest of the system learns the
 *   fact, the audit trail is the durable security evidence of it.
 * - **The actor comes from trusted context.** The audit entry carries no actor
 *   of its own; the recorder resolves the ambient authenticated principal from
 *   the actor scope, so a refusal or a change is filed under the identity the
 *   boundary verified, never one a caller supplied.
 */
@Injectable()
export class ActorEventRecorder implements RoleEventRecorderPort {
  public constructor(
    private readonly outbox: RoleEventRecorderPort,
    private readonly audit: AuditRecorder,
  ) {}

  public async record(event: DomainEvent<unknown>): Promise<void> {
    const entry = classify(event);

    await this.outbox.record(event);

    if (entry !== undefined) {
      await this.audit.record(entry);
    }
  }
}

/**
 * Maps one identity event to an audit entry, or `undefined` when the fact is
 * not audited.
 *
 * @throws Error — the event is not one this adapter has classified. Recording
 * it as something else, or dropping it, would both lose the security record the
 * classification exists to produce.
 */
export function classify(event: DomainEvent<unknown>): AuditEntry | undefined {
  switch (event.name) {
    case 'RolePermissionGranted': {
      const data = as<{ readonly roleId: string; readonly permission: string }>(event);
      return auditEntry({
        action: 'role.permission_granted',
        outcome: 'success',
        target: { type: 'role', id: data.roleId },
        metadata: { permission: data.permission },
        causationId: event.metadata.messageId,
      });
    }
    case 'RolePermissionRevoked': {
      const data = as<{ readonly roleId: string; readonly permission: string }>(event);
      return auditEntry({
        action: 'role.permission_revoked',
        outcome: 'success',
        target: { type: 'role', id: data.roleId },
        metadata: { permission: data.permission },
        causationId: event.metadata.messageId,
      });
    }
    case 'RoleAssigned': {
      const data = as<{ readonly membershipId: string; readonly roleId: string }>(event);
      return auditEntry({
        action: 'role.assigned',
        outcome: 'success',
        target: { type: 'membership', id: data.membershipId },
        metadata: { roleId: data.roleId },
        causationId: event.metadata.messageId,
      });
    }
    case 'RoleUnassigned': {
      const data = as<{ readonly membershipId: string; readonly roleId: string }>(event);
      return auditEntry({
        action: 'role.unassigned',
        outcome: 'success',
        target: { type: 'membership', id: data.membershipId },
        metadata: { roleId: data.roleId },
        causationId: event.metadata.messageId,
      });
    }
    case 'RoleStatusChanged': {
      const data = as<{ readonly roleId: string; readonly from: string; readonly to: string }>(
        event,
      );
      return auditEntry({
        action: 'role.status_changed',
        outcome: 'success',
        target: { type: 'role', id: data.roleId },
        metadata: { from: data.from, to: data.to },
        causationId: event.metadata.messageId,
      });
    }
    case 'MembershipCreated': {
      const data = as<{ readonly membershipId: string; readonly userId: string }>(event);
      return auditEntry({
        action: 'membership.created',
        outcome: 'success',
        target: { type: 'membership', id: data.membershipId },
        metadata: { userId: data.userId },
        causationId: event.metadata.messageId,
      });
    }
    case 'MembershipStatusChanged': {
      const data = as<{
        readonly membershipId: string;
        readonly from: string;
        readonly to: string;
      }>(event);
      return auditEntry({
        action: 'membership.changed',
        outcome: 'success',
        target: { type: 'membership', id: data.membershipId },
        metadata: { from: data.from, to: data.to },
        causationId: event.metadata.messageId,
      });
    }
    case 'UserStatusChanged': {
      const data = as<{ readonly userId: string; readonly from: string; readonly to: string }>(
        event,
      );
      return auditEntry({
        action: 'user.status_changed',
        outcome: 'success',
        target: { type: 'user', id: data.userId },
        metadata: { from: data.from, to: data.to },
        causationId: event.metadata.messageId,
      });
    }

    // Benign facts: they describe something unrelated to what the resource
    // could do (a new name, a new actor), so the outbox carries them and the
    // audit trail does not.
    case 'RoleCreated':
    case 'RoleRenamed':
    case 'UserCreated':
    case 'UserProfileUpdated':
    case 'SignOutSucceeded':
      return undefined;

    default:
      throw new Error(
        `ActorEventRecorder: no audit decision for event "${event.name}". ` +
          'Classify it or add a forwarding rule.',
      );
  }
}

/** Reads an event's body as the shape this adapter knows it carries. */
function as<T>(event: DomainEvent<unknown>): T {
  return event.data as T;
}

/** Builds the audit entry for an access-control change, with the ambient actor. */
function auditEntry(fields: {
  readonly action: string;
  readonly outcome: string;
  readonly target: { readonly type: string; readonly id: string };
  readonly metadata: Record<string, unknown>;
  readonly causationId: string;
}): AuditEntry {
  const actor = ActorScope.current();

  return {
    action: fields.action,
    outcome: fields.outcome,
    target: fields.target,
    metadata: fields.metadata,
    causationId: fields.causationId,
    ...(actor === undefined ? {} : { actorUserId: actor.userId }),
  };
}
