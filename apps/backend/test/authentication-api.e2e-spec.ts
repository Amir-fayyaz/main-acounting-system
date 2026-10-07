import { createHash, randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { configureApplication } from '../src/bootstrap.js';
import { AppConfigModule } from '../src/infrastructure/config/app-config.module.js';
import { AppConfigService } from '../src/infrastructure/config/app-config.service.js';
import { TRANSACTION_BOUNDARY } from '../src/infrastructure/database/database.tokens.js';
import {
  AUTHENTICATION_AUDIT_RECORDER,
  AUTH_SESSION_REPOSITORY,
  CREDENTIAL_REPOSITORY,
  PASSWORD_HASHER,
  SESSION_TOKEN_SERVICE,
} from '../src/modules/identity/application/authentication.tokens.js';
import type { AuthenticationAuditRecorder } from '../src/modules/identity/application/ports/authentication-audit-recorder.port.js';
import type { PasswordHasher } from '../src/modules/identity/application/ports/password-hasher.port.js';
import type { SessionTokenService } from '../src/modules/identity/application/ports/session-token-service.port.js';
import { GetAuthenticatedSessionUseCase } from '../src/modules/identity/application/use-cases/get-authenticated-session.use-case.js';
import { SetUserCredentialUseCase } from '../src/modules/identity/application/use-cases/set-user-credential.use-case.js';
import { SignInUseCase } from '../src/modules/identity/application/use-cases/sign-in.use-case.js';
import { SignOutUseCase } from '../src/modules/identity/application/use-cases/sign-out.use-case.js';
import { USER_REPOSITORY } from '../src/modules/identity/application/user.tokens.js';
import { AuthSession } from '../src/modules/identity/domain/aggregates/auth-session.js';
import { Credential } from '../src/modules/identity/domain/aggregates/credential.js';
import type { AuthSessionRepository } from '../src/modules/identity/domain/repositories/auth-session.repository.js';
import type { CredentialRepository } from '../src/modules/identity/domain/repositories/credential.repository.js';
import type { UserRepository } from '../src/modules/identity/domain/repositories/user.repository.js';
import { PlainPassword } from '../src/modules/identity/domain/value-objects/plain-password.js';
import { AuthenticationController } from '../src/modules/identity/presentation/controllers/authentication.controller.js';
import { CredentialsController } from '../src/modules/identity/presentation/controllers/credential.controller.js';
import { AuthenticationGuard } from '../src/modules/identity/presentation/guards/authentication.guard.js';
import { CryptoSessionTokenService } from '../src/modules/identity/infrastructure/security/crypto-session-token-service.js';
import { ScryptPasswordHasher } from '../src/modules/identity/infrastructure/security/scrypt-password-hasher.js';
import { DateTime } from '../src/shared/time/date-time.js';
import type { TransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';
import {
  InMemoryAuthSessionRepository,
  InMemoryCredentialRepository,
  RecordingAuthenticationAudit,
} from './support/authentication-doubles.js';
import {
  InMemoryUserRepository,
  PassthroughTransactionBoundary,
  aUser,
} from './support/user-doubles.js';

/**
 * The authentication contract over the real HTTP boundary (IAM-005; FND-006).
 *
 * These tests bind the **real** password hasher and the **real** token adapter —
 * the security mechanism is what is being verified, so it is not doubled — with
 * in-memory repositories and the recording audit boundary, so the whole HTTP
 * flow (routing, validation, guards, the error contract, the OpenAPI document)
 * runs without a database. Persistence against MySQL is covered separately by
 * `authentication-persistence.e2e-spec.ts`.
 *
 * They also pin the security posture the acceptance criteria require: a failed
 * sign-in reveals nothing, inactive and expired and invalidated states are
 * refused, no response carries credential material, and authentication alone
 * grants no tenant access.
 */

const PASSWORD = 'correct horse battery staple';

interface Harness {
  readonly app: INestApplication;
  readonly users: InMemoryUserRepository;
  readonly credentials: InMemoryCredentialRepository;
  readonly sessions: InMemoryAuthSessionRepository;
  readonly audit: RecordingAuthenticationAudit;
  readonly sessionTtlMinutes: number;
}

async function createHarness(): Promise<Harness> {
  const users = new InMemoryUserRepository();
  const credentials = new InMemoryCredentialRepository();
  const sessions = new InMemoryAuthSessionRepository();
  const audit = new RecordingAuthenticationAudit();
  const boundary = new PassthroughTransactionBoundary();
  const hasher = new ScryptPasswordHasher();
  const tokens = new CryptoSessionTokenService();

  const moduleRef = await Test.createTestingModule({
    imports: [AppConfigModule],
    controllers: [AuthenticationController, CredentialsController],
    providers: [
      { provide: USER_REPOSITORY, useValue: users },
      { provide: CREDENTIAL_REPOSITORY, useValue: credentials },
      { provide: AUTH_SESSION_REPOSITORY, useValue: sessions },
      { provide: PASSWORD_HASHER, useValue: hasher },
      { provide: SESSION_TOKEN_SERVICE, useValue: tokens },
      { provide: AUTHENTICATION_AUDIT_RECORDER, useValue: audit },
      { provide: TRANSACTION_BOUNDARY, useValue: boundary },
      {
        provide: SignInUseCase,
        useFactory: (
          u: UserRepository,
          c: CredentialRepository,
          s: AuthSessionRepository,
          h: PasswordHasher,
          t: SessionTokenService,
          a: AuthenticationAuditRecorder,
          b: TransactionBoundary,
          config: AppConfigService,
        ) => new SignInUseCase(u, c, s, h, t, a, b, config.authentication.sessionTtlMinutes),
        inject: [
          USER_REPOSITORY,
          CREDENTIAL_REPOSITORY,
          AUTH_SESSION_REPOSITORY,
          PASSWORD_HASHER,
          SESSION_TOKEN_SERVICE,
          AUTHENTICATION_AUDIT_RECORDER,
          TRANSACTION_BOUNDARY,
          AppConfigService,
        ],
      },
      {
        provide: SignOutUseCase,
        useFactory: (
          s: AuthSessionRepository,
          a: AuthenticationAuditRecorder,
          b: TransactionBoundary,
        ) => new SignOutUseCase(s, a, b),
        inject: [AUTH_SESSION_REPOSITORY, AUTHENTICATION_AUDIT_RECORDER, TRANSACTION_BOUNDARY],
      },
      {
        provide: GetAuthenticatedSessionUseCase,
        useFactory: (
          u: UserRepository,
          s: AuthSessionRepository,
          t: SessionTokenService,
          a: AuthenticationAuditRecorder,
        ) => new GetAuthenticatedSessionUseCase(u, s, t, a),
        inject: [
          USER_REPOSITORY,
          AUTH_SESSION_REPOSITORY,
          SESSION_TOKEN_SERVICE,
          AUTHENTICATION_AUDIT_RECORDER,
        ],
      },
      {
        provide: SetUserCredentialUseCase,
        useFactory: (
          u: UserRepository,
          c: CredentialRepository,
          s: AuthSessionRepository,
          h: PasswordHasher,
          a: AuthenticationAuditRecorder,
          b: TransactionBoundary,
        ) => new SetUserCredentialUseCase(u, c, s, h, a, b),
        inject: [
          USER_REPOSITORY,
          CREDENTIAL_REPOSITORY,
          AUTH_SESSION_REPOSITORY,
          PASSWORD_HASHER,
          AUTHENTICATION_AUDIT_RECORDER,
          TRANSACTION_BOUNDARY,
        ],
      },
      AuthenticationGuard,
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureApplication(app);
  await app.init();

  return {
    app,
    users,
    credentials,
    sessions,
    audit,
    sessionTtlMinutes: app.get(AppConfigService).authentication.sessionTtlMinutes,
  };
}

describe('authentication resource (e2e)', () => {
  let app: INestApplication;
  let harness: Harness;

  beforeAll(async () => {
    harness = await createHarness();
    app = harness.app;
  });

  afterAll(async () => {
    await app.close();
  });

  /** Seeds an active user with the given credential and answers its identity. */
  async function aUserWithCredential(
    options: { status?: 'active' | 'inactive'; password?: string } = {},
  ): Promise<{ id: string; email: string }> {
    const user = aUser('Ali Rezaei', `ali.${randomUUID()}@example.com`);
    if (options.status === 'inactive') {
      user.deactivate(user.createdAt);
    }
    harness.users.seed(user);

    const credential = Credential.create({
      userId: user.id,
      passwordHash: await new ScryptPasswordHasher().hash(
        PlainPassword.from(options.password ?? PASSWORD),
      ),
      now: DateTime.now(),
    });
    harness.credentials.seed(credential);

    return { id: user.id.value, email: user.email.value };
  }

  function server(): ReturnType<INestApplication['getHttpServer']> {
    return app.getHttpServer();
  }

  /** The digest the server stores for a token, computed independently here. */
  function digestOf(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  describe('sign-in', () => {
    it('signs a user in, returns the token once and stores only its digest', async () => {
      const user = await aUserWithCredential();

      const before = Date.now();
      const response = await request(server())
        .post('/api/v1/auth/sign-in')
        .send({ email: user.email, password: PASSWORD })
        .expect(201);

      expect(response.body).toMatchObject({
        tokenType: 'Bearer',
        principal: { userId: user.id, email: user.email, displayName: 'Ali Rezaei' },
      });
      expect(response.body.token).toMatch(/^[A-Za-z0-9_-]{40,}$/);

      // The token expires according to the configured lifetime, not a literal.
      const expiresAt = Date.parse(String(response.body.expiresAt));
      const ttl = harness.sessionTtlMinutes * 60_000;
      expect(expiresAt).toBeGreaterThanOrEqual(before + ttl - 5_000);
      expect(expiresAt).toBeLessThanOrEqual(Date.now() + ttl + 5_000);

      // What is persisted is a digest, never the token, and the session belongs
      // to the user that authenticated.
      const stored = await harness.sessions.findByTokenHash(
        new CryptoSessionTokenService().hash(String(response.body.token)),
      );
      expect(stored?.aggregate.userId.value).toBe(user.id);
      expect(stored?.aggregate.tokenHash.value).toBe(digestOf(String(response.body.token)));
      expect(stored?.aggregate.tokenHash.value).not.toBe(String(response.body.token));
      expect(stored?.aggregate.isUsable(DateTime.now())).toBe(true);

      // The successful authentication is auditable, in the approved boundary.
      expect(harness.audit.names()).toContain('UserAuthenticated');
    });

    it('never returns credential material and stays free of tenant claims', async () => {
      const user = await aUserWithCredential();

      const response = await request(server())
        .post('/api/v1/auth/sign-in')
        .send({ email: user.email, password: PASSWORD })
        .expect(201);

      expect(Object.keys(response.body).sort()).toEqual(
        ['expiresAt', 'principal', 'token', 'tokenType'].sort(),
      );
      expect(Object.keys(response.body.principal).sort()).toEqual(
        ['displayName', 'email', 'userId'].sort(),
      );

      const body = JSON.stringify(response.body);
      expect(body).not.toContain(PASSWORD);
      for (const forbidden of [
        'password',
        'passwordHash',
        'tokenHash',
        'secret',
        'tenantId',
        'tenant',
        'membership',
        'role',
        'permissions',
      ]) {
        expect(body.toLowerCase()).not.toContain(forbidden.toLowerCase());
      }
    });

    it('rejects invalid credentials without revealing which component was wrong', async () => {
      const user = await aUserWithCredential();

      const wrongPassword = await request(server())
        .post('/api/v1/auth/sign-in')
        .send({ email: user.email, password: 'a different secret entirely' })
        .expect(401);
      const unknownEmail = await request(server())
        .post('/api/v1/auth/sign-in')
        .send({ email: `nobody.${randomUUID()}@example.com`, password: PASSWORD })
        .expect(401);
      const userWithoutCredential = aUser('No Credential', `nc.${randomUUID()}@example.com`);
      harness.users.seed(userWithoutCredential);
      const noCredential = await request(server())
        .post('/api/v1/auth/sign-in')
        .send({ email: userWithoutCredential.email.value, password: PASSWORD })
        .expect(401);

      for (const response of [wrongPassword, unknownEmail, noCredential]) {
        expect(response.body.error).toMatchObject({
          code: 'INVALID_CREDENTIALS',
          category: 'client',
          message: 'The email or password is incorrect.',
        });
        expect(response.body.error.correlationId).toBeTruthy();
      }

      // Same code, same message, same status: only the correlation id differs,
      // and no response names an email, an account or a credential.
      const bodies = [wrongPassword, unknownEmail, noCredential].map((response) => ({
        ...response.body.error,
        correlationId: undefined,
      }));
      expect(bodies[0]).toEqual(bodies[1]);
      expect(bodies[1]).toEqual(bodies[2]);
    });

    it('rejects an inactive user once the secret matched', async () => {
      const user = await aUserWithCredential({ status: 'inactive' });
      const sessionsBefore = harness.sessions.addCalls;

      const response = await request(server())
        .post('/api/v1/auth/sign-in')
        .send({ email: user.email, password: PASSWORD })
        .expect(401);

      expect(response.body.error.code).toBe('ACCOUNT_NOT_AUTHENTICATABLE');
      // Whatever else this suite has signed in, this attempt established no state.
      expect(harness.sessions.addCalls).toBe(sessionsBefore);
    });

    it('rejects a malformed request at the boundary', async () => {
      const response = await request(server())
        .post('/api/v1/auth/sign-in')
        .send({ email: 'not-an-email', password: '', tenantId: 'sneaky' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      const fields = response.body.error.details.map((detail: { field: string }) => detail.field);
      expect(fields).toContain('email');
      expect(fields).toContain('password');
    });
  });

  describe('session validation', () => {
    it('accepts the token of an active user and answers with the principal', async () => {
      const user = await aUserWithCredential();
      const signIn = await request(server())
        .post('/api/v1/auth/sign-in')
        .send({ email: user.email, password: PASSWORD })
        .expect(201);

      const response = await request(server())
        .get('/api/v1/auth/session')
        .set('authorization', `Bearer ${String(signIn.body.token)}`)
        // A client-supplied tenant identity is ignored: authentication cannot
        // select, grant or imply access to a tenant.
        .set('x-tenant-id', '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70')
        .expect(200);

      expect(response.body).toMatchObject({
        sessionId: expect.stringMatching(/^[0-9a-f-]{36}$/),
        principal: { userId: user.id, email: user.email },
      });
      expect(JSON.stringify(response.body)).not.toContain(String(signIn.body.token));
      expect(response.body).not.toHaveProperty('tenantId');
      expect(response.body).not.toHaveProperty('permissions');
    });

    it('rejects a missing, malformed or unknown token', async () => {
      const missing = await request(server()).get('/api/v1/auth/session').expect(401);
      const wrongScheme = await request(server())
        .get('/api/v1/auth/session')
        .set('authorization', 'Basic dXNlcjpwYXNzd29yZA==')
        .expect(401);
      const unknown = await request(server())
        .get('/api/v1/auth/session')
        .set('authorization', 'Bearer not-a-token-anybody-issued')
        .expect(401);

      expect(missing.body.error.code).toBe('AUTHENTICATION_REQUIRED');
      expect(wrongScheme.body.error.code).toBe('AUTHENTICATION_REQUIRED');
      expect(unknown.body.error.code).toBe('AUTHENTICATION_STATE_REJECTED');
      expect(harness.audit.names()).toContain('AuthenticationStateRejected');
    });

    it('rejects an expired session', async () => {
      const user = await aUserWithCredential();
      const rawToken = `expired-${randomUUID()}`;
      const now = DateTime.now();
      const created = AuthSession.create({
        userId: (await harness.users.findByEmail(user.email))!.aggregate.id,
        tokenHash: new CryptoSessionTokenService().hash(rawToken),
        expiresAt: DateTime.fromEpochMillis(now.epochMillis + 1_000),
        now,
      });
      harness.sessions.seed(
        AuthSession.rehydrate({
          ...created.snapshot(),
          expiresAt: DateTime.fromEpochMillis(DateTime.now().epochMillis - 1_000),
        }),
      );

      const response = await request(server())
        .get('/api/v1/auth/session')
        .set('authorization', `Bearer ${rawToken}`)
        .expect(401);

      expect(response.body.error.code).toBe('SESSION_EXPIRED');
    });

    it('rejects a session whose user was deactivated after sign-in', async () => {
      const user = await aUserWithCredential();
      const signIn = await request(server())
        .post('/api/v1/auth/sign-in')
        .send({ email: user.email, password: PASSWORD })
        .expect(201);

      const stored = (await harness.users.findByEmail(user.email))!.aggregate;
      const revision = harness.users.revisionOf(stored.id);
      stored.deactivate(DateTime.now());
      harness.users.seed(stored, revision);

      const response = await request(server())
        .get('/api/v1/auth/session')
        .set('authorization', `Bearer ${String(signIn.body.token)}`)
        .expect(401);

      expect(response.body.error.code).toBe('ACCOUNT_NOT_AUTHENTICATABLE');
    });
  });

  describe('sign-out', () => {
    it('invalidates the session and refuses the token from then on', async () => {
      const user = await aUserWithCredential();
      const signIn = await request(server())
        .post('/api/v1/auth/sign-in')
        .send({ email: user.email, password: PASSWORD })
        .expect(201);
      const token = String(signIn.body.token);

      await request(server())
        .post('/api/v1/auth/sign-out')
        .set('authorization', `Bearer ${token}`)
        .expect(204);

      const rejected = await request(server())
        .get('/api/v1/auth/session')
        .set('authorization', `Bearer ${token}`)
        .expect(401);
      expect(rejected.body.error.code).toBe('SESSION_REVOKED');

      // The record is kept: invalidation is a state, not a deletion.
      const stored = await harness.sessions.findByTokenHash(
        new CryptoSessionTokenService().hash(token),
      );
      expect(stored?.aggregate.isRevoked()).toBe(true);
      expect(harness.audit.names()).toContain('AuthenticationEnded');
    });

    it('refuses to sign out an unauthenticated request', async () => {
      await request(server()).post('/api/v1/auth/sign-out').expect(401);
    });
  });

  describe('credential provisioning', () => {
    it('establishes a credential and never returns it', async () => {
      const user = aUser('Provisioned', `p.${randomUUID()}@example.com`);
      harness.users.seed(user);

      const response = await request(server())
        .put(`/api/v1/users/${user.id.value}/credential`)
        .send({ password: PASSWORD })
        .expect(200);

      expect(response.body).toMatchObject({
        userId: user.id.value,
        algorithm: 'scrypt',
        replaced: false,
        sessionsInvalidated: 0,
      });
      expect(JSON.stringify(response.body)).not.toContain(PASSWORD);

      // The stored value is a salted, self-describing hash — not the secret.
      const stored = harness.credentials.stored(user.id);
      expect(stored?.snapshot().passwordHash.startsWith('scrypt(')).toBe(true);
      expect(stored?.snapshot().passwordHash).not.toContain(PASSWORD);

      // And it authenticates.
      await request(server())
        .post('/api/v1/auth/sign-in')
        .send({ email: user.email.value, password: PASSWORD })
        .expect(201);
    });

    it('invalidates the sessions the previous secret established', async () => {
      const user = await aUserWithCredential();
      const signIn = await request(server())
        .post('/api/v1/auth/sign-in')
        .send({ email: user.email, password: PASSWORD })
        .expect(201);

      const rotated = await request(server())
        .put(`/api/v1/users/${user.id}/credential`)
        .send({ password: 'an entirely new secret value' })
        .expect(200);

      expect(rotated.body).toMatchObject({ replaced: true, sessionsInvalidated: 1 });

      const rejected = await request(server())
        .get('/api/v1/auth/session')
        .set('authorization', `Bearer ${String(signIn.body.token)}`)
        .expect(401);
      expect(rejected.body.error.code).toBe('SESSION_REVOKED');

      await request(server())
        .post('/api/v1/auth/sign-in')
        .send({ email: user.email, password: 'an entirely new secret value' })
        .expect(201);
    });

    it('rejects a weak password, an unknown user and an inactive user', async () => {
      const user = aUser('Weak', `w.${randomUUID()}@example.com`);
      harness.users.seed(user);
      const inactive = await aUserWithCredential({ status: 'inactive' });

      const weak = await request(server())
        .put(`/api/v1/users/${user.id.value}/credential`)
        .send({ password: 'too-short' })
        .expect(400);
      const unknown = await request(server())
        .put(`/api/v1/users/${randomUUID()}/credential`)
        .send({ password: PASSWORD })
        .expect(404);
      const notAuthenticatable = await request(server())
        .put(`/api/v1/users/${inactive.id}/credential`)
        .send({ password: PASSWORD })
        .expect(422);

      // A rejected secret is a validation failure at the HTTP boundary: 400 with
      // the field named and the value never echoed. The policy itself lives in
      // the domain (and is asserted in the use-case spec).
      expect(weak.body.error.code).toBe('VALIDATION_FAILED');
      expect(weak.body.error.category).toBe('validation');
      expect(weak.body.error.details.map((detail: { field: string }) => detail.field)).toContain(
        'password',
      );
      expect(JSON.stringify(weak.body)).not.toContain('too-short');
      expect(unknown.body.error.code).toBe('NOT_FOUND');
      expect(notAuthenticatable.body.error.code).toBe('USER_INACTIVE');
      expect(harness.credentials.stored(user.id)).toBeUndefined();
    });
  });

  describe('security posture', () => {
    it('writes no credential to the process output', async () => {
      const user = await aUserWithCredential();
      const writes: string[] = [];
      const original = process.stdout.write.bind(process.stdout);
      process.stdout.write = ((chunk: string | Uint8Array): boolean => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write;

      let token = '';
      try {
        const signedIn = await request(server())
          .post('/api/v1/auth/sign-in')
          .send({ email: user.email, password: PASSWORD })
          .expect(201);
        token = String(signedIn.body.token);

        await request(server())
          .post('/api/v1/auth/sign-in')
          .send({ email: user.email, password: 'a wrong secret entirely' })
          .expect(401);
        await request(server())
          .put(`/api/v1/users/${user.id}/credential`)
          .send({ password: 'yet another secret value' })
          .expect(200);
      } finally {
        process.stdout.write = original as typeof process.stdout.write;
      }

      const output = writes.join('\n');
      expect(output).not.toContain(PASSWORD);
      expect(output).not.toContain('yet another secret value');
      expect(output).not.toContain(token);
      expect(output).not.toContain('scrypt(');
      // Nothing was logged at all: the flows above are ordinary traffic, and the
      // API does not log request bodies.
      expect(output).not.toContain('password');
    });

    it('declares the authentication scheme and the protected operations', async () => {
      const document = await request(server()).get('/api/docs-json').expect(200);

      expect(document.body.components.securitySchemes.bearer).toMatchObject({
        type: 'http',
        scheme: 'bearer',
      });
      expect(document.body.paths['/api/v1/auth/sign-in'].post.security).toBeUndefined();
      expect(document.body.paths['/api/v1/auth/session'].get.security).toEqual([{ bearer: [] }]);
      expect(document.body.paths['/api/v1/auth/sign-out'].post.security).toEqual([{ bearer: [] }]);
      expect(document.body.paths['/api/v1/users/{id}/credential'].put).toBeDefined();
    });

    it('describes no credential field on any response schema', async () => {
      const document = await request(server()).get('/api/docs-json').expect(200);

      const schemas: Record<string, { properties?: Record<string, unknown> }> =
        document.body.components.schemas;

      for (const name of [
        'SignInResponseDto',
        'AuthenticatedSessionResponseDto',
        'CredentialResponseDto',
        'PrincipalDto',
      ]) {
        const properties = Object.keys(schemas[name]?.properties ?? {});
        expect(properties).not.toContain('password');
        expect(properties).not.toContain('passwordHash');
        expect(properties).not.toContain('tokenHash');
      }
    });
  });
});
