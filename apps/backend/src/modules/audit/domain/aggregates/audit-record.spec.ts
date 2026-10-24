import { describe, expect, it } from 'vitest';

import { InvalidPrimitiveError } from '../../../../shared/primitives/invalid-primitive-error.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { AuditActor } from '../value-objects/audit-actor.js';
import { AuditAction } from '../value-objects/audit-action.js';
import { AUDIT_REDACTION_MARKER } from '../value-objects/audit-metadata.js';
import { auditRecordIdFrom } from '../value-objects/audit-record-id.js';
import { AuditOutcome } from '../value-objects/audit-outcome.js';
import { AuditTarget } from '../value-objects/audit-target.js';
import { AuditRecord, type AuditRecordSnapshot } from './audit-record.js';

/**
 * The audit record (AUD-001; ADR-003 section 21).
 *
 * The spec pins the properties the acceptance criteria name one by one: who
 * acted (including the system, without a user id), which tenant, what happened,
 * on what, with what outcome, when, and how it is correlated — plus the two that
 * make the record trustworthy: it is immutable, and credential material cannot
 * enter it.
 */

const NOW = DateTime.parse('2026-10-16T09:30:00.000Z');
const TENANT = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const USER = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71';

function aRecord(overrides: Partial<Parameters<typeof AuditRecord.create>[0]> = {}): AuditRecord {
  return AuditRecord.create({
    action: AuditAction.from('user.signed_in'),
    outcome: AuditOutcome.SUCCESS,
    actor: AuditActor.user(USER),
    occurredAt: NOW,
    ...overrides,
  });
}

describe('AuditRecord — the fact it captures', () => {
  it('carries actor, tenant, action, target, outcome, time and correlation', () => {
    const record = aRecord({
      tenantId: TENANT,
      target: AuditTarget.of('user', USER),
      correlationId: 'request-1',
      causationId: 'command-1',
      metadata: { reason: 'fresh_session' },
    });

    expect(record.id.value).toMatch(/^[0-9a-f-]{36}$/);
    expect(record.tenantId).toBe(TENANT);
    expect(record.actor.isUser()).toBe(true);
    expect(record.actor.userId).toBe(USER);
    expect(record.action.value).toBe('user.signed_in');
    expect(record.target?.type).toBe('user');
    expect(record.target?.id).toBe(USER);
    expect(record.outcome.isSuccess()).toBe(true);
    expect(record.occurredAt.toIsoString()).toBe('2026-10-16T09:30:00.000Z');
    expect(record.correlationId).toBe('request-1');
    expect(record.causationId).toBe('command-1');
    expect(record.metadata).toEqual({ reason: 'fresh_session' });
    expect(record.isTenantScoped()).toBe(true);
  });

  it.each([
    ['success', AuditOutcome.SUCCESS],
    ['failure', AuditOutcome.FAILURE],
    ['denied', AuditOutcome.DENIED],
  ] as const)('represents the %s outcome', (_name, outcome) => {
    const record = aRecord({ outcome });

    expect(record.outcome.value).toBe(outcome.value);
    expect(record.isSuccess()).toBe(outcome === AuditOutcome.SUCCESS);
    expect(record.isDenied()).toBe(outcome === AuditOutcome.DENIED);
  });

  it('represents a system-generated fact with no user id', () => {
    const record = aRecord({ actor: AuditActor.system() });

    expect(record.actor.isSystem()).toBe(true);
    expect(record.actor.userId).toBeUndefined();
    expect(record.snapshot().actorUserId).toBeUndefined();
  });

  it('handles a fact with no tenant, no target and no correlation', () => {
    const record = aRecord();

    expect(record.isTenantScoped()).toBe(false);
    expect(record.target).toBeUndefined();
    expect(record.correlationId).toBeUndefined();
    expect(record.causationId).toBeUndefined();
    expect(record.snapshot()).not.toHaveProperty('tenantId');
    expect(record.snapshot()).not.toHaveProperty('targetId');
  });

  it('normalizes every optional reference it stores', () => {
    expect(() => aRecord({ tenantId: 'not a tenant id' })).toThrow(InvalidPrimitiveError);
    expect(() => aRecord({ correlationId: '' })).toThrow(InvalidPrimitiveError);
    expect(() => aRecord({ causationId: 'a'.repeat(200) })).toThrow(InvalidPrimitiveError);
    expect(() => aRecord({ actor: AuditActor.user('') })).toThrow(InvalidPrimitiveError);
    expect(() => AuditTarget.of('User Type!', USER)).toThrow(InvalidPrimitiveError);
    expect(() => AuditTarget.of('user', '')).toThrow(InvalidPrimitiveError);
  });

  it('accepts an explicit identity, so a test can pin one', () => {
    const record = aRecord({ id: auditRecordIdFrom('018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f72') });

    expect(record.id.value).toBe('018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f72');
  });
});

describe('AuditRecord — immutability and safety', () => {
  it('is frozen and cannot be edited, by field or by reflection', () => {
    const record = aRecord({ tenantId: TENANT });

    expect(Object.isFrozen(record)).toBe(true);
    expect(Reflect.set(record, 'tenantId', 'another-tenant')).toBe(false);
    expect(Reflect.set(record, 'outcome', AuditOutcome.FAILURE)).toBe(false);
    expect(record.tenantId).toBe(TENANT);
    expect(record.outcome.isSuccess()).toBe(true);
  });

  it('sanitizes context before the record exists, so no secret is ever stored', () => {
    const record = aRecord({
      metadata: {
        reason: 'INVALID_SECRET',
        presentedPassword: 'correct horse battery staple',
        session: { token: 'a-live-token' },
      },
    });

    const serialized = JSON.stringify(record.snapshot().metadata);
    expect(serialized).not.toContain('correct horse battery staple');
    expect(serialized).not.toContain('a-live-token');
    expect(serialized).toContain(AUDIT_REDACTION_MARKER);
    expect(record.metadata.reason).toBe('INVALID_SECRET');
  });

  it('hands out a snapshot that cannot reach back into the record', () => {
    const record = aRecord({ metadata: { reason: 'INVALID_SECRET' } });
    const snapshot = record.snapshot();

    expect(Reflect.set(snapshot, 'tenantId', 'another-tenant')).toBe(false);
    expect(Reflect.set(snapshot, 'action', 'user.signed_out')).toBe(false);
    expect(record.tenantId).toBeUndefined();
    expect(record.action.value).toBe('user.signed_in');
  });
});

describe('AuditRecord — rehydration', () => {
  const snapshot: AuditRecordSnapshot = {
    id: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f72',
    tenantId: TENANT,
    actorType: 'user',
    actorUserId: USER,
    action: 'purchase.approved',
    targetType: 'purchase',
    targetId: '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f73',
    outcome: 'denied',
    occurredAt: NOW,
    correlationId: 'request-1',
    causationId: 'command-1',
    metadata: { reason: 'MEMBERSHIP_REQUIRED' },
  };

  it('round-trips a stored record', () => {
    const record = AuditRecord.rehydrate(snapshot);

    expect(record.snapshot()).toEqual(snapshot);
    expect(record.outcome.isDenied()).toBe(true);
  });

  it('re-sanitizes stored context', () => {
    const record = AuditRecord.rehydrate({
      ...snapshot,
      metadata: { reason: 'INVALID_SECRET', passwordHash: 'stored-hash' },
    });

    expect(JSON.stringify(record.metadata)).not.toContain('stored-hash');
    expect(record.metadata.passwordHash).toBe(AUDIT_REDACTION_MARKER);
  });

  it.each([
    ['an unknown actor kind', { ...snapshot, actorType: 'robot' as never }],
    ['a system actor carrying a user id', { ...snapshot, actorType: 'system' as const }],
    ['a user actor without a user id', { ...snapshot, actorUserId: undefined }],
    ['an unknown outcome', { ...snapshot, outcome: 'maybe' as never }],
    ['a malformed action', { ...snapshot, action: 'signed_in' }],
    ['a malformed id', { ...snapshot, id: 'not-a-uuid' }],
    ['a malformed tenant', { ...snapshot, tenantId: 'not a tenant' }],
  ])('refuses a broken row: %s', (_name, broken) => {
    expect(() => AuditRecord.rehydrate(broken as AuditRecordSnapshot)).toThrow(
      InvalidPrimitiveError,
    );
  });

  it('refuses a half-specified target rather than storing an unusable reference', () => {
    expect(() =>
      AuditRecord.rehydrate({ ...snapshot, targetType: 'purchase', targetId: undefined }),
    ).not.toThrow();
    // Sanitizing the pair away is the deliberate answer: a type with no id (or an
    // id with no type) cannot be resolved by any reader.
    expect(
      AuditRecord.rehydrate({ ...snapshot, targetType: 'purchase', targetId: undefined }).target,
    ).toBeUndefined();
  });
});
