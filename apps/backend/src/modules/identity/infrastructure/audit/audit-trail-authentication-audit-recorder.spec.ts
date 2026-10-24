import { describe, expect, it } from 'vitest';

import { RecordingAuditTrail } from '../../../../../test/support/audit-doubles.js';
import { DomainEvent } from '../../../../shared/messaging/domain-event.js';
import { causedBy } from '../../../../shared/messaging/message.js';
import {
  AuthenticationEnded,
  AuthenticationStateRejected,
  SignInFailed,
  UserAuthenticated,
  UserCredentialEstablished,
} from '../../domain/events/authentication.events.js';
import { AuditTrailAuthenticationAuditRecorder } from './audit-trail-authentication-audit-recorder.js';

/**
 * The translation from authentication facts to audit entries (IAM-005; AUD-001).
 *
 * The audit module never learns authentication vocabulary and authentication
 * never learns audit storage, so this adapter is where the two meet — which
 * makes its mapping the thing to pin: every security fact of the flow becomes a
 * record with an actor, an outcome and a target, and no fact carries credential
 * material into the trail.
 */

const USER = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const SESSION = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71';

function harness(): {
  audit: RecordingAuditTrail;
  recorder: AuditTrailAuthenticationAuditRecorder;
} {
  const audit = new RecordingAuditTrail();

  return { audit, recorder: new AuditTrailAuthenticationAuditRecorder(audit) };
}

describe('AuditTrailAuthenticationAuditRecorder — the security facts it records', () => {
  it('records a successful sign-in as user.signed_in with the user as actor', async () => {
    const app = harness();

    await app.recorder.record(
      new UserAuthenticated({
        userId: USER,
        sessionId: SESSION,
        expiresAt: '2026-10-16T10:00:00.000Z',
      }),
    );

    expect(app.audit.recorded).toHaveLength(1);
    expect(app.audit.find('user.signed_in')).toMatchObject({
      outcome: 'success',
      actorUserId: USER,
      target: { type: 'user', id: USER },
      metadata: { sessionId: SESSION, expiresAt: '2026-10-16T10:00:00.000Z' },
    });
  });

  it('records a failed sign-in as user.sign_in_failed, with the reason and no secret', async () => {
    const app = harness();

    await app.recorder.record(
      new SignInFailed({ email: 'ali@example.com', reason: 'INVALID_SECRET', userId: USER }),
    );

    const recorded = app.audit.find('user.sign_in_failed')!;
    expect(recorded.outcome).toBe('failure');
    expect(recorded.actorUserId).toBe(USER);
    expect(recorded.metadata).toEqual({ reason: 'INVALID_SECRET' });
  });

  it('records an attempt against an unknown credential as a system-acted fact with the attempted email', async () => {
    const app = harness();

    await app.recorder.record(
      new SignInFailed({ email: 'nobody@example.com', reason: 'UNKNOWN_CREDENTIAL' }),
    );

    const recorded = app.audit.find('user.sign_in_failed')!;
    // No user was ever resolved, so no user is named — an honest system actor
    // rather than an invented identity.
    expect(recorded.actorUserId).toBeUndefined();
    expect(recorded.target).toBeUndefined();
    expect(recorded.metadata).toEqual({
      reason: 'UNKNOWN_CREDENTIAL',
      attemptedEmail: 'nobody@example.com',
    });
  });

  it('records a sign-out as user.signed_out', async () => {
    const app = harness();

    await app.recorder.record(new AuthenticationEnded({ userId: USER, sessionId: SESSION }));

    expect(app.audit.find('user.signed_out')).toMatchObject({
      outcome: 'success',
      actorUserId: USER,
      metadata: { sessionId: SESSION },
    });
  });

  it('records a rejected authentication state as authentication.denied, aimed at the session', async () => {
    const app = harness();

    await app.recorder.record(
      new AuthenticationStateRejected({ reason: 'REVOKED', sessionId: SESSION, userId: USER }),
    );

    expect(app.audit.find('authentication.denied')).toMatchObject({
      outcome: 'denied',
      actorUserId: USER,
      target: { type: 'session', id: SESSION },
      metadata: { reason: 'REVOKED', sessionId: SESSION },
    });
  });

  it('records a rejection with no state presented as a denied fact with no target', async () => {
    const app = harness();

    await app.recorder.record(new AuthenticationStateRejected({ reason: 'MISSING_TOKEN' }));

    const recorded = app.audit.find('authentication.denied')!;
    expect(recorded.outcome).toBe('denied');
    expect(recorded.actorUserId).toBeUndefined();
    expect(recorded.target).toBeUndefined();
    expect(recorded.metadata).toEqual({ reason: 'MISSING_TOKEN' });
  });

  it('records a credential change with its algorithm and blast radius, never the hash', async () => {
    const app = harness();

    await app.recorder.record(
      new UserCredentialEstablished({
        userId: USER,
        algorithm: 'scrypt',
        replaced: true,
        sessionsInvalidated: 3,
      }),
    );

    expect(app.audit.find('user.credential_changed')).toMatchObject({
      outcome: 'success',
      actorUserId: USER,
      target: { type: 'user', id: USER },
      metadata: { algorithm: 'scrypt', replaced: true, sessionsInvalidated: 3 },
    });
  });
});

describe('AuditTrailAuthenticationAuditRecorder — correlation and completeness', () => {
  it('keeps the correlation of the flow and the causation of the fact it records', async () => {
    const app = harness();
    const cause = new UserAuthenticated(
      { userId: USER, sessionId: SESSION, expiresAt: '2026-10-16T10:00:00.000Z' },
      { correlationId: 'request-7' },
    );
    const raised = new UserAuthenticated(
      { userId: USER, sessionId: SESSION, expiresAt: '2026-10-16T10:00:00.000Z' },
      causedBy(cause),
    );

    await app.recorder.record(raised);

    const recorded = app.audit.find('user.signed_in')!;
    expect(recorded.correlationId).toBe('request-7');
    expect(recorded.causationId).toBe(cause.metadata.messageId);
  });

  it('fails loudly on a fact it cannot map, instead of dropping a security record', async () => {
    class SomethingHappened extends DomainEvent<unknown> {
      public constructor() {
        super('SomethingHappened', {});
      }
    }

    const app = harness();

    await expect(app.recorder.record(new SomethingHappened())).rejects.toThrow(
      /No audit entry is defined/,
    );
    expect(app.audit.recorded).toEqual([]);
  });

  it('records exactly one entry per fact', async () => {
    const app = harness();

    await app.recorder.record(new AuthenticationEnded({ userId: USER, sessionId: SESSION }));

    expect(app.audit.recorded).toHaveLength(1);
  });
});
