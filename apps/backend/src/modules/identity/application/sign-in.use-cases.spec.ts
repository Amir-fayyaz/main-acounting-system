import { beforeEach, describe, expect, it } from 'vitest';

import {
  createAuthenticationHarness,
  seedCredential,
  seedSession,
  seedUser,
  TEST_PASSWORD,
  type AuthenticationHarness,
} from '../../../../test/support/authentication-harness.js';
import { EntityId } from '../../../shared/id/entity-id.js';
import { TenantScope } from '../../../shared/tenant/tenant-scope.js';
import { DateTime } from '../../../shared/time/date-time.js';
import { PlainPassword } from '../domain/value-objects/plain-password.js';
import { userIdFrom } from '../domain/value-objects/user-id.js';
import { SignIn } from './commands/sign-in.command.js';
import { SetUserCredential } from './commands/set-user-credential.command.js';
import { GetAuthenticatedSession } from './queries/get-authenticated-session.query.js';

/**
 * Sign-in and credential provisioning (IAM-005).
 *
 * These tests pin the security behaviour the acceptance criteria describe:
 * credentials are never stored or logged in plaintext, a failed attempt does not
 * reveal which component was wrong, an inactive user is rejected after the
 * secret matched, a successful sign-in establishes a principal and nothing else,
 * and a credential change ends the sessions the previous secret established.
 */

let app: AuthenticationHarness;

beforeEach(() => {
  app = createAuthenticationHarness();
});

/** Every recorded audit event as one string, for "no credential in the trail". */
function auditText(): string {
  return JSON.stringify(app.audit.recorded);
}

describe('sign-in', () => {
  it('establishes an authenticated session and returns the token exactly once', async () => {
    const user = await seedUser(app);
    await seedCredential(app, user);

    const outcome = await app.signIn.execute(
      new SignIn({ email: user.email.value, password: TEST_PASSWORD }),
    );

    expect(outcome.isOk()).toBe(true);
    const view = outcome.valueOrThrow();

    // The token is high-entropy, opaque and paired with a principal that carries
    // identity only: no tenant, role, permission or membership.
    expect(view.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(view.tokenType).toBe('Bearer');
    expect(view.principal).toEqual({
      userId: user.id.value,
      displayName: user.displayName.value,
      email: user.email.value,
    });
    expect(Object.keys(view.principal).sort()).toEqual(['displayName', 'email', 'userId']);

    // Only the digest is stored, and it really is the digest of the token.
    const stored = await app.sessions.findByTokenHash(app.tokens.hash(view.token));
    expect(stored).toBeDefined();
    expect(stored?.aggregate.userId.value).toBe(user.id.value);
    expect(stored?.aggregate.tokenHash.value).not.toBe(view.token);
    expect(app.sessions.addCalls).toBe(1);

    // The audit record names the fact and the session, and carries no credential.
    expect(app.audit.names()).toEqual(['UserAuthenticated']);
    expect(auditText()).not.toContain(view.token);
    expect(auditText()).not.toContain(TEST_PASSWORD);
    expect(app.audit.recorded[0]?.metadata.tenantId).toBeUndefined();
  });

  it('expires the session according to the configured lifetime', async () => {
    app = createAuthenticationHarness(15);
    const user = await seedUser(app);
    await seedCredential(app, user);

    const before = DateTime.now().epochMillis;
    const view = (
      await app.signIn.execute(new SignIn({ email: user.email.value, password: TEST_PASSWORD }))
    ).valueOrThrow();
    const after = DateTime.now().epochMillis;

    const expiresAt = DateTime.parse(view.expiresAt).epochMillis;
    expect(expiresAt).toBeGreaterThanOrEqual(before + 15 * 60_000);
    expect(expiresAt).toBeLessThanOrEqual(after + 15 * 60_000);
  });

  it('answers an unknown email exactly like a wrong password', async () => {
    const user = await seedUser(app);
    await seedCredential(app, user, 'a completely different secret');

    const wrongSecret = await app.signIn.execute(
      new SignIn({ email: user.email.value, password: TEST_PASSWORD }),
    );
    const unknownEmail = await app.signIn.execute(
      new SignIn({ email: 'nobody@example.com', password: TEST_PASSWORD }),
    );

    for (const outcome of [wrongSecret, unknownEmail]) {
      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().code).toBe('INVALID_CREDENTIALS');
      expect(outcome.errorOrThrow().message).toBe('The email or password is incorrect.');
    }
    expect(wrongSecret.errorOrThrow().message).toBe(unknownEmail.errorOrThrow().message);

    // Neither attempt created authentication state, and both are audited — with
    // the coarse reason kept for the trail, not for the client.
    expect(app.sessions.addCalls).toBe(0);
    expect(app.audit.names()).toEqual(['SignInFailed', 'SignInFailed']);
    expect(app.audit.recorded[0]?.toJSON()).toMatchObject({ data: { reason: 'INVALID_SECRET' } });
    expect(app.audit.recorded[1]?.toJSON()).toMatchObject({
      data: { reason: 'UNKNOWN_CREDENTIAL' },
    });
    expect(auditText()).not.toContain(TEST_PASSWORD);
  });

  it('spends derivation work when no credential can be verified', async () => {
    const withoutCredential = await seedUser(app);

    const outcome = await app.signIn.execute(
      new SignIn({ email: withoutCredential.email.value, password: TEST_PASSWORD }),
    );

    expect(outcome.errorOrThrow().code).toBe('INVALID_CREDENTIALS');
    // One dummy derivation for the user with no credential, so "no such secret"
    // costs the same as a wrong one.
    expect(app.hasher.dummyVerifications).toBe(1);
    expect(app.hasher.verifyCalls).toBe(0);
  });

  it('rejects an inactive user only after the secret matched', async () => {
    const user = await seedUser(app, { status: 'inactive' });
    await seedCredential(app, user);

    const withCorrectSecret = await app.signIn.execute(
      new SignIn({ email: user.email.value, password: TEST_PASSWORD }),
    );
    const withWrongSecret = await app.signIn.execute(
      new SignIn({ email: user.email.value, password: 'a different secret entirely' }),
    );

    expect(withCorrectSecret.errorOrThrow().code).toBe('ACCOUNT_NOT_AUTHENTICATABLE');
    expect(withWrongSecret.errorOrThrow().code).toBe('INVALID_CREDENTIALS');
    expect(app.sessions.addCalls).toBe(0);
    expect(app.audit.recorded[0]?.toJSON()).toMatchObject({
      data: { reason: 'ACCOUNT_NOT_AUTHENTICATABLE' },
    });
  });

  it('rejects a secret that breaks the policy before spending any derivation', async () => {
    const user = await seedUser(app);
    await seedCredential(app, user);

    const hashCallsAfterSeeding = app.hasher.hashCalls;
    const outcome = await app.signIn.execute(
      new SignIn({ email: user.email.value, password: 'x' }),
    );

    expect(outcome.errorOrThrow().code).toBe('PASSWORD_POLICY_VIOLATION');
    expect(app.hasher.verifyCalls).toBe(0);
    expect(app.hasher.dummyVerifications).toBe(0);
    expect(app.hasher.hashCalls).toBe(hashCallsAfterSeeding);
    expect(app.sessions.addCalls).toBe(0);
  });

  it('rejects a malformed email as an expected validation failure', async () => {
    const outcome = await app.signIn.execute(
      new SignIn({ email: 'not-an-email', password: TEST_PASSWORD }),
    );

    expect(outcome.errorOrThrow().code).toBe('VALIDATION_FAILED');
    expect(app.audit.recorded).toEqual([]);
  });

  it('grants no tenant context and reads no membership', async () => {
    const user = await seedUser(app);
    await seedCredential(app, user);

    // No tenant scope exists before or after authentication: sign-in establishes
    // identity, and access to a tenant stays a separate decision.
    expect(TenantScope.current().state).toBe('missing');

    await app.signIn.execute(new SignIn({ email: user.email.value, password: TEST_PASSWORD }));

    expect(TenantScope.current().state).toBe('missing');
    expect(app.users.findByEmailCalls).toBe(1);
    expect(app.credentials.addCalls).toBe(0);
  });
});

describe('set user credential', () => {
  it('establishes a credential for an existing user without storing the secret', async () => {
    const user = await seedUser(app);

    const outcome = await app.setCredential.execute(
      new SetUserCredential({ userId: user.id.value, password: TEST_PASSWORD }),
    );

    expect(outcome.isOk()).toBe(true);
    const view = outcome.valueOrThrow();
    expect(view).toMatchObject({
      userId: user.id.value,
      algorithm: 'test-sha256',
      replaced: false,
      sessionsInvalidated: 0,
    });

    const stored = app.credentials.stored(user.id);
    expect(stored).toBeDefined();
    expect(stored?.snapshot().passwordHash).not.toContain(TEST_PASSWORD);
    expect(stored?.passwordHash.algorithm).toBe('test-sha256');
    if (stored === undefined) {
      throw new Error('the credential was not stored');
    }
    await expect(
      app.hasher.verify(PlainPassword.from(TEST_PASSWORD), stored.passwordHash),
    ).resolves.toBe(true);

    // The credential is auditable, and the audit record carries no secret.
    expect(app.audit.names()).toEqual(['UserCredentialEstablished']);
    expect(app.audit.recorded[0]?.toJSON()).toMatchObject({
      data: { userId: user.id.value, replaced: false, sessionsInvalidated: 0 },
    });
    expect(auditText()).not.toContain(TEST_PASSWORD);
  });

  it('replaces an existing credential and advances its revision', async () => {
    const user = await seedUser(app);
    await seedCredential(app, user, 'the original secret value');

    const outcome = await app.setCredential.execute(
      new SetUserCredential({ userId: user.id.value, password: TEST_PASSWORD }),
    );

    expect(outcome.valueOrThrow()).toMatchObject({ replaced: true, sessionsInvalidated: 0 });
    expect(app.credentials.updateCalls).toBe(1);
    expect(app.credentials.revisionOf(user.id)?.value).toBe(2);

    // The new secret authenticates; the old one does not.
    const withNew = await app.signIn.execute(
      new SignIn({ email: user.email.value, password: TEST_PASSWORD }),
    );
    const withOld = await app.signIn.execute(
      new SignIn({ email: user.email.value, password: 'the original secret value' }),
    );
    expect(withNew.isOk()).toBe(true);
    expect(withOld.errorOrThrow().code).toBe('INVALID_CREDENTIALS');
  });

  it('invalidates the sessions the previous secret established', async () => {
    const user = await seedUser(app);
    await seedCredential(app, user, 'the original secret value');
    const first = seedSession(app, user);
    const second = seedSession(app, user);

    const outcome = await app.setCredential.execute(
      new SetUserCredential({ userId: user.id.value, password: TEST_PASSWORD }),
    );

    expect(outcome.valueOrThrow().sessionsInvalidated).toBe(2);
    expect(app.sessions.stored(first.session.id)?.isRevoked()).toBe(true);
    expect(app.sessions.stored(second.session.id)?.isRevoked()).toBe(true);

    // A session established before the secret changed can no longer authenticate.
    const rejected = await app.getAuthenticatedSession.execute(
      new GetAuthenticatedSession({ token: first.token }),
    );
    expect(rejected.errorOrThrow().code).toBe('SESSION_REVOKED');
  });

  it('refuses an inactive user, an unknown user and a malformed identity', async () => {
    const inactive = await seedUser(app, { status: 'inactive' });

    const inactiveOutcome = await app.setCredential.execute(
      new SetUserCredential({ userId: inactive.id.value, password: TEST_PASSWORD }),
    );
    const unknownOutcome = await app.setCredential.execute(
      new SetUserCredential({ userId: EntityId.generate().value, password: TEST_PASSWORD }),
    );
    const malformedOutcome = await app.setCredential.execute(
      new SetUserCredential({ userId: 'not-a-uuid', password: TEST_PASSWORD }),
    );

    expect(inactiveOutcome.errorOrThrow().code).toBe('USER_INACTIVE');
    expect(unknownOutcome.errorOrThrow().code).toBe('USER_NOT_FOUND');
    expect(malformedOutcome.errorOrThrow().code).toBe('USER_NOT_FOUND');
    expect(app.credentials.addCalls).toBe(0);
  });

  it('refuses a password that breaks the policy without hashing it', async () => {
    const user = await seedUser(app);

    const outcome = await app.setCredential.execute(
      new SetUserCredential({ userId: user.id.value, password: 'too-short' }),
    );

    expect(outcome.errorOrThrow().code).toBe('PASSWORD_POLICY_VIOLATION');
    expect(app.hasher.hashCalls).toBe(0);
    expect(app.credentials.addCalls).toBe(0);
  });

  it('rotates the existing credential instead of adding a second one', async () => {
    const user = await seedUser(app);

    const created = await app.setCredential.execute(
      new SetUserCredential({ userId: user.id.value, password: 'the first secret value' }),
    );
    const rotated = await app.setCredential.execute(
      new SetUserCredential({ userId: user.id.value, password: 'the second secret value' }),
    );

    expect(created.valueOrThrow().replaced).toBe(false);
    expect(rotated.valueOrThrow().replaced).toBe(true);
    expect(app.credentials.addCalls).toBe(1);
    expect(app.credentials.updateCalls).toBe(1);
    expect(app.credentials.revisionOf(user.id)?.value).toBe(2);
  });

  it('refuses a rotation that lost the race instead of overwriting the winner', async () => {
    const user = await seedUser(app);
    const winner = await app.hasher.hash(PlainPassword.from('the winner secret value'));
    await seedCredential(app, user, 'the original secret value');
    const observed = await app.credentials.get(userIdFrom(user.id.value));

    // While this call derives its hash, another provisioner rotates the
    // credential. The write below therefore names a revision that is already
    // stale, which is exactly the race the compare-and-swap exists for.
    const derive = app.hasher.hash.bind(app.hasher);
    app.hasher.hash = async (password) => {
      const hash = await derive(password);
      const competing = await app.credentials.get(userIdFrom(user.id.value));
      competing!.aggregate.replacePasswordHash(winner, DateTime.now());
      await app.credentials.update(competing!.aggregate, competing!.revision);
      return hash;
    };

    const outcome = await app.setCredential.execute(
      new SetUserCredential({ userId: user.id.value, password: 'the losing secret value' }),
    );

    expect(observed).toBeDefined();
    expect(outcome.isFail()).toBe(true);
    expect(outcome.errorOrThrow().code).toBe('CONFLICT');
    expect(outcome.errorOrThrow().category).toBe('CONFLICT');
    expect(outcome.errorOrThrow().details[0]).toMatchObject({ code: 'STALE_REVISION' });
    // The winner stands; the loser wrote nothing.
    expect(app.credentials.stored(user.id)?.passwordHash.equals(winner)).toBe(true);
  });
});
