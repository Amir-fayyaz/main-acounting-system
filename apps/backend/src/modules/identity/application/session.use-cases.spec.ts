import { beforeEach, describe, expect, it } from 'vitest';

import {
  createAuthenticationHarness,
  seedCredential,
  seedSession,
  seedUser,
  type AuthenticationHarness,
} from '../../../../test/support/authentication-harness.js';
import { EntityId } from '../../../shared/id/entity-id.js';
import { DateTime } from '../../../shared/time/date-time.js';
import { SignOut } from './commands/sign-out.command.js';
import { GetAuthenticatedSession } from './queries/get-authenticated-session.query.js';

/**
 * Authentication state: validation, expiry, invalidation (IAM-005).
 *
 * These tests pin the accept/refuse decision the whole API depends on: a known,
 * unexpired, not-invalidated session belonging to a user who may authenticate is
 * accepted; **every** other state is refused, and a refusal is recorded.
 */

let app: AuthenticationHarness;

beforeEach(() => {
  app = createAuthenticationHarness();
});

describe('get authenticated session', () => {
  it('accepts a valid state and answers with the principal', async () => {
    const user = await seedUser(app);
    await seedCredential(app, user);
    const { session, token } = seedSession(app, user);

    const outcome = await app.getAuthenticatedSession.execute(
      new GetAuthenticatedSession({ token }),
    );

    expect(outcome.isOk()).toBe(true);
    const view = outcome.valueOrThrow();
    expect(view.sessionId).toBe(session.id.value);
    expect(view.expiresAt).toBe(session.expiresAt.toIsoString());
    expect(view.principal.userId).toBe(user.id.value);
    expect(view.principal).not.toHaveProperty('tenantId');
    expect(view.principal).not.toHaveProperty('permissions');

    // A successful validation is not an audited event: only rejections are.
    expect(app.audit.recorded).toEqual([]);
    // And validating does not extend the session.
    expect(app.sessions.updateCalls).toBe(0);
  });

  it('refuses a request that presented no token, and records it', async () => {
    for (const token of [undefined, '', '   ']) {
      app.audit.recorded.length = 0;

      const outcome = await app.getAuthenticatedSession.execute(
        new GetAuthenticatedSession({ token }),
      );

      expect(outcome.errorOrThrow().code).toBe('AUTHENTICATION_REQUIRED');
      expect(app.audit.recorded[0]?.toJSON()).toMatchObject({
        data: { reason: 'MISSING_TOKEN' },
      });
    }
  });

  it('refuses a token that matches no session', async () => {
    const outcome = await app.getAuthenticatedSession.execute(
      new GetAuthenticatedSession({ token: 'a token nobody issued' }),
    );

    expect(outcome.errorOrThrow().code).toBe('AUTHENTICATION_STATE_REJECTED');
    expect(app.audit.recorded[0]?.toJSON()).toMatchObject({ data: { reason: 'UNKNOWN_TOKEN' } });
  });

  it('refuses an expired session and keeps the record', async () => {
    const user = await seedUser(app);
    await seedCredential(app, user);
    const expired = DateTime.fromEpochMillis(DateTime.now().epochMillis - 60_000);
    const { session, token } = seedSession(app, user, { expiresAt: expired });

    const outcome = await app.getAuthenticatedSession.execute(
      new GetAuthenticatedSession({ token }),
    );

    expect(outcome.errorOrThrow().code).toBe('SESSION_EXPIRED');
    expect(app.audit.recorded[0]?.toJSON()).toMatchObject({
      data: { reason: 'EXPIRED', userId: user.id.value },
    });
    // Expiry is a state, not a deletion: the record is still there to audit.
    expect(app.sessions.stored(session.id)?.isExpired(DateTime.now())).toBe(true);
  });

  it('refuses an invalidated session', async () => {
    const user = await seedUser(app);
    await seedCredential(app, user);
    const { token } = seedSession(app, user, { revoked: true });

    const outcome = await app.getAuthenticatedSession.execute(
      new GetAuthenticatedSession({ token }),
    );

    expect(outcome.errorOrThrow().code).toBe('SESSION_REVOKED');
    expect(app.audit.recorded[0]?.toJSON()).toMatchObject({ data: { reason: 'REVOKED' } });
  });

  it('refuses a session whose user no longer exists', async () => {
    const user = await seedUser(app);
    const { token } = seedSession(app, user);
    // Remove the identity behind the session: the session alone is not enough.
    app.users.remove(user.id);

    const outcome = await app.getAuthenticatedSession.execute(
      new GetAuthenticatedSession({ token }),
    );

    expect(outcome.errorOrThrow().code).toBe('AUTHENTICATION_STATE_REJECTED');
    expect(app.audit.recorded[0]?.toJSON()).toMatchObject({ data: { reason: 'USER_MISSING' } });
  });

  it('refuses a session whose user may no longer authenticate', async () => {
    const user = await seedUser(app);
    await seedCredential(app, user);
    const { token } = seedSession(app, user);
    // Deactivation does not touch sessions; validation re-checks the lifecycle,
    // so an existing session stops being accepted on the very next request.
    user.deactivate(DateTime.now());
    app.users.seed(user, app.users.revisionOf(user.id));

    const outcome = await app.getAuthenticatedSession.execute(
      new GetAuthenticatedSession({ token }),
    );

    expect(outcome.errorOrThrow().code).toBe('ACCOUNT_NOT_AUTHENTICATABLE');
    expect(app.audit.recorded[0]?.toJSON()).toMatchObject({
      data: { reason: 'USER_NOT_AUTHENTICATABLE' },
    });
  });
});

describe('sign-out', () => {
  it('invalidates the session, records it, and refuses the token from then on', async () => {
    const user = await seedUser(app);
    await seedCredential(app, user);
    const { session, token } = seedSession(app, user);

    const outcome = await app.signOut.execute(new SignOut({ sessionId: session.id.value }));

    expect(outcome.isOk()).toBe(true);
    expect(outcome.valueOrThrow().sessionId).toBe(session.id.value);
    expect(app.sessions.stored(session.id)?.isRevoked()).toBe(true);
    expect(app.sessions.updateCalls).toBe(1);
    expect(app.audit.names()).toEqual(['AuthenticationEnded']);

    const rejected = await app.getAuthenticatedSession.execute(
      new GetAuthenticatedSession({ token }),
    );
    expect(rejected.errorOrThrow().code).toBe('SESSION_REVOKED');
  });

  it('refuses to invalidate a session that is already invalidated or expired', async () => {
    const user = await seedUser(app);
    const revoked = seedSession(app, user, { revoked: true });
    const expired = seedSession(app, user, {
      expiresAt: DateTime.fromEpochMillis(DateTime.now().epochMillis - 1_000),
    });

    const revokedOutcome = await app.signOut.execute(
      new SignOut({ sessionId: revoked.session.id.value }),
    );
    const expiredOutcome = await app.signOut.execute(
      new SignOut({ sessionId: expired.session.id.value }),
    );

    expect(revokedOutcome.errorOrThrow().code).toBe('SESSION_REVOKED');
    expect(expiredOutcome.errorOrThrow().code).toBe('SESSION_EXPIRED');
    expect(app.sessions.updateCalls).toBe(0);
    expect(app.audit.names()).toEqual(['AuthenticationStateRejected', 'AuthenticationStateRejected']);
  });

  it('refuses an unknown or malformed session identity', async () => {
    const unknown = await app.signOut.execute(
      new SignOut({ sessionId: EntityId.generate().value }),
    );
    const malformed = await app.signOut.execute(new SignOut({ sessionId: 'not-a-uuid' }));

    expect(unknown.errorOrThrow().code).toBe('AUTHENTICATION_STATE_REJECTED');
    expect(malformed.errorOrThrow().code).toBe('AUTHENTICATION_STATE_REJECTED');
    // The malformed identity never became a lookup, so only the unknown one is
    // recorded as a rejection.
    expect(app.audit.names()).toEqual(['AuthenticationStateRejected']);
  });
});
