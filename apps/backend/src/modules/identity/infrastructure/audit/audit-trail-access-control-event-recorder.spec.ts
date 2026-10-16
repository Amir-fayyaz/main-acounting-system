import { describe, expect, it } from 'vitest';

import { ActorScope } from '../../../../shared/actor/actor-scope.js';
import type { DomainEvent } from '../../../../shared/messaging/domain-event.js';
import type {
  AuditEntry,
  AuditRecorder,
} from '../../../audit/application/ports/audit-recorder.port.js';
import { ActorEventRecorder, classify } from './audit-trail-access-control-event-recorder.js';

/**
 * The access-control → audit translation (AUD-001; IAM-003/004).
 *
 * The adapter is where identity's vocabulary and audit's are allowed to meet, so
 * its mapping is the thing to pin: every sensitive access-control fact becomes
 * an audit entry with a target and a causation, benign facts are forwarded
 * without one, and a fact the adapter cannot classify fails loudly rather than
 * vanishing from the trail.
 */

/** A stand-in for a raised domain event, carrying only what the adapter reads. */
function event(name: string, data: unknown, messageId = 'cmd-abc-123'): DomainEvent<unknown> {
  return {
    name,
    data,
    metadata: { messageId, correlationId: undefined, causationId: undefined },
  } as unknown as DomainEvent<unknown>;
}

describe('classify — the audit decision per event', () => {
  it('maps role permission granted', () => {
    const entry = classify(
      event('RolePermissionGranted', { roleId: 'role-7', permission: 'role.manage' }),
    );

    expect(entry).toMatchObject({
      action: 'role.permission_granted',
      outcome: 'success',
      target: { type: 'role', id: 'role-7' },
      causationId: 'cmd-abc-123',
    });
    expect(entry?.metadata).toEqual({ permission: 'role.manage' });
  });

  it('maps role permission revoked', () => {
    expect(
      classify(event('RolePermissionRevoked', { roleId: 'role-7', permission: 'role.manage' })),
    ).toMatchObject({ action: 'role.permission_revoked', target: { type: 'role', id: 'role-7' } });
  });

  it('maps role assigned', () => {
    const entry = classify(
      event('RoleAssigned', {
        assignmentId: 'assign-9',
        membershipId: 'membership-3',
        roleId: 'role-7',
      }),
    );

    expect(entry).toMatchObject({
      action: 'role.assigned',
      target: { type: 'membership', id: 'membership-3' },
    });
    expect(entry?.metadata).toEqual({ roleId: 'role-7' });
  });

  it('maps role unassigned', () => {
    expect(
      classify(
        event('RoleUnassigned', {
          assignmentId: 'assign-9',
          membershipId: 'membership-3',
          roleId: 'role-7',
        }),
      ),
    ).toMatchObject({
      action: 'role.unassigned',
      target: { type: 'membership', id: 'membership-3' },
    });
  });

  it('maps role status changed', () => {
    const entry = classify(
      event('RoleStatusChanged', { roleId: 'role-7', from: 'active', to: 'inactive' }),
    );

    expect(entry).toMatchObject({
      action: 'role.status_changed',
      target: { type: 'role', id: 'role-7' },
    });
    expect(entry?.metadata).toEqual({ from: 'active', to: 'inactive' });
  });

  it('maps membership created', () => {
    const entry = classify(
      event('MembershipCreated', { membershipId: 'membership-3', userId: 'user-19' }),
    );

    expect(entry).toMatchObject({
      action: 'membership.created',
      target: { type: 'membership', id: 'membership-3' },
    });
    expect(entry?.metadata).toEqual({ userId: 'user-19' });
  });

  it('maps membership status changed', () => {
    const entry = classify(
      event('MembershipStatusChanged', {
        membershipId: 'membership-3',
        userId: 'user-19',
        from: 'active',
        to: 'inactive',
      }),
    );

    expect(entry).toMatchObject({ action: 'membership.changed' });
    expect(entry?.metadata).toEqual({ from: 'active', to: 'inactive' });
  });

  it('maps user status changed', () => {
    const entry = classify(
      event('UserStatusChanged', { userId: 'user-19', from: 'active', to: 'suspended' }),
    );

    expect(entry).toMatchObject({
      action: 'user.status_changed',
      target: { type: 'user', id: 'user-19' },
    });
    expect(entry?.metadata).toEqual({ from: 'active', to: 'suspended' });
  });

  it.each([
    ['RoleCreated', { roleId: 'role-7', name: 'editors', permissions: [] }],
    ['RoleRenamed', { roleId: 'role-7', name: 'editors' }],
    ['UserCreated', { userId: 'user-19', displayName: 'Alex', email: 'alex@example.com' }],
    ['UserProfileUpdated', { userId: 'user-19', displayName: 'Alex', email: 'alex@example.com' }],
    ['SignOutSucceeded', { userId: 'user-19', sessionId: 'session-1' }],
  ])('forwards the benign fact %s without an audit entry', (name, data) => {
    expect(classify(event(name, data))).toBeUndefined();
  });

  it('throws on a fact it has not classified, rather than dropping it', () => {
    expect(() => classify(event('SomethingUnmapped', { id: 'x' }))).toThrow(
      /no audit decision for event "SomethingUnmapped"/,
    );
  });
});

describe('ActorEventRecorder', () => {
  /** The outbox write side, counting what it was handed. */
  class RecordingOutbox {
    public calls = 0;

    public async record(): Promise<void> {
      this.calls += 1;
    }
  }

  /** The audit write side, recording every entry it was handed. */
  class RecordingAudit implements AuditRecorder {
    public readonly recorded: AuditEntry[] = [];

    public async record(entry: AuditEntry): Promise<void> {
      this.recorded.push(entry);
    }
  }

  function build(): {
    outbox: RecordingOutbox;
    audit: RecordingAudit;
    recorder: ActorEventRecorder;
  } {
    const outbox = new RecordingOutbox();
    const audit = new RecordingAudit();

    return { outbox, audit, recorder: new ActorEventRecorder(outbox, audit) };
  }

  it('records a sensitive event on the outbox and on the audit trail', async () => {
    const { outbox, audit, recorder } = build();

    await recorder.record(
      event('RolePermissionGranted', { roleId: 'role-7', permission: 'role.manage' }),
    );

    expect(outbox.calls).toBe(1);
    expect(audit.recorded).toHaveLength(1);
    expect(audit.recorded[0]).toMatchObject({
      action: 'role.permission_granted',
      outcome: 'success',
      target: { type: 'role', id: 'role-7' },
    });
  });

  it('forwards a benign event to the outbox without auditing it', async () => {
    const { outbox, audit, recorder } = build();

    await recorder.record(event('RoleRenamed', { roleId: 'role-7', name: 'editors' }));

    expect(outbox.calls).toBe(1);
    expect(audit.recorded).toHaveLength(0);
  });

  it('fails loudly on an unrecognised event and writes nothing', async () => {
    const { outbox, audit, recorder } = build();

    await expect(recorder.record(event('SomethingUnmapped', { id: 'x' }))).rejects.toThrow();

    // The decision is made before any side effect: an unclassified fact is
    // neither forwarded nor audited as something it is not.
    expect(outbox.calls).toBe(0);
    expect(audit.recorded).toHaveLength(0);
  });

  it('files the record under the ambient authenticated actor', async () => {
    const { audit, recorder } = build();

    await ActorScope.run('u-42', () =>
      recorder.record(
        event('RolePermissionGranted', { roleId: 'role-7', permission: 'role.manage' }),
      ),
    );

    expect(audit.recorded).toHaveLength(1);
    expect(audit.recorded[0]?.actorUserId).toBe('u-42');
  });

  it('records no actor when the operation runs without one', async () => {
    const { audit, recorder } = build();

    await recorder.record(
      event('RolePermissionGranted', { roleId: 'role-7', permission: 'role.manage' }),
    );

    expect(audit.recorded[0]?.actorUserId).toBeUndefined();
  });
});
