import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { configureApplication } from '../src/bootstrap.js';
import { AppConfigModule } from '../src/infrastructure/config/app-config.module.js';
import { TRANSACTION_BOUNDARY } from '../src/infrastructure/database/database.tokens.js';
import {
  AUTHENTICATION_AUDIT_RECORDER,
  AUTH_SESSION_REPOSITORY,
  CREDENTIAL_REPOSITORY,
  PASSWORD_HASHER,
} from '../src/modules/identity/application/authentication.tokens.js';
import type { AuthenticationAuditRecorder } from '../src/modules/identity/application/ports/authentication-audit-recorder.port.js';
import type { PasswordHasher } from '../src/modules/identity/application/ports/password-hasher.port.js';
import type { UserEventRecorder } from '../src/modules/identity/application/ports/user-event-recorder.port.js';
import { CreateUserUseCase } from '../src/modules/identity/application/use-cases/create-user.use-case.js';
import { GetAuthenticatedSessionUseCase } from '../src/modules/identity/application/use-cases/get-authenticated-session.use-case.js';
import { SetUserCredentialUseCase } from '../src/modules/identity/application/use-cases/set-user-credential.use-case.js';
import { SignInUseCase } from '../src/modules/identity/application/use-cases/sign-in.use-case.js';
import { SignOutUseCase } from '../src/modules/identity/application/use-cases/sign-out.use-case.js';
import { SignUpUseCase } from '../src/modules/identity/application/use-cases/sign-up.use-case.js';
import {
  USER_EVENT_RECORDER,
  USER_REPOSITORY,
} from '../src/modules/identity/application/user.tokens.js';
import type { AuthSessionRepository } from '../src/modules/identity/domain/repositories/auth-session.repository.js';
import type { CredentialRepository } from '../src/modules/identity/domain/repositories/credential.repository.js';
import type { UserRepository } from '../src/modules/identity/domain/repositories/user.repository.js';
import { AuthenticationController } from '../src/modules/identity/presentation/controllers/authentication.controller.js';
import { RateLimitGuard } from '../src/infrastructure/api/rate-limit/rate-limit.guard.js';
import { RATE_LIMITER } from '../src/infrastructure/api/rate-limit/rate-limit.tokens.js';
import type { RateLimiter } from '../src/infrastructure/api/rate-limit/rate-limiter.js';
import { ScryptPasswordHasher } from '../src/modules/identity/infrastructure/security/scrypt-password-hasher.js';
import { CryptoSessionTokenService } from '../src/modules/identity/infrastructure/security/crypto-session-token-service.js';
import {
  InMemoryAuthSessionRepository,
  InMemoryCredentialRepository,
  RecordingAuthenticationAudit,
  RecordingSecurityLogger,
} from './support/authentication-doubles.js';
import { TEST_LOCKOUT_POLICY } from './support/authentication-harness.js';
import {
  InMemoryUserRepository,
  PassthroughTransactionBoundary,
  RecordingUserEvents,
} from './support/user-doubles.js';

/**
 * The sign-up contract over the real HTTP boundary (IAM-008; FND-006).
 *
 * These tests bind the **real** password hasher — the security mechanism is
 * what is being verified — with in-memory repositories and recording event/audit
 * boundaries, so the whole HTTP flow (routing, validation, the public policy,
 * the error contract, the OpenAPI document) runs without a database.
 * Persistence against MySQL is covered separately by
 * `sign-up-persistence.e2e-spec.ts`.
 *
 * They pin the posture the acceptance criteria require: only the public user
 * fields are returned, a malformed or weak request writes nothing, a claimed
 * email is a conflict that creates no credential, a failed registration leaves
 * no partial state, and sign-up grants no tenant, membership or role.
 */

const PASSWORD = 'correct horse battery staple';

interface Harness {
  readonly app: INestApplication;
  readonly users: InMemoryUserRepository;
  readonly credentials: InMemoryCredentialRepository;
  readonly sessions: InMemoryAuthSessionRepository;
  readonly userEvents: RecordingUserEvents;
  readonly audit: RecordingAuthenticationAudit;
}

async function createHarness(): Promise<Harness> {
  const users = new InMemoryUserRepository();
  const credentials = new InMemoryCredentialRepository();
  const sessions = new InMemoryAuthSessionRepository();
  const userEvents = new RecordingUserEvents();
  const audit = new RecordingAuthenticationAudit();
  const boundary = new PassthroughTransactionBoundary();
  const hasher: PasswordHasher = new ScryptPasswordHasher();

  const createUser = new CreateUserUseCase(users, userEvents, boundary);
  const setCredential = new SetUserCredentialUseCase(
    users,
    credentials,
    sessions,
    hasher,
    audit,
    boundary,
  );
  const signUp = new SignUpUseCase(createUser, setCredential, boundary);

  // The controller now carries the whole authentication resource; the use cases
  // beside sign-up are plain doubles over the same in-memory repositories, so
  // the endpoints under test here never run.
  const tokens = new CryptoSessionTokenService();

  const moduleRef = await Test.createTestingModule({
    imports: [AppConfigModule],
    controllers: [AuthenticationController],
    providers: [
      { provide: USER_REPOSITORY, useValue: users satisfies UserRepository },
      { provide: CREDENTIAL_REPOSITORY, useValue: credentials satisfies CredentialRepository },
      { provide: AUTH_SESSION_REPOSITORY, useValue: sessions satisfies AuthSessionRepository },
      { provide: PASSWORD_HASHER, useValue: hasher },
      { provide: USER_EVENT_RECORDER, useValue: userEvents satisfies UserEventRecorder },
      {
        provide: AUTHENTICATION_AUDIT_RECORDER,
        useValue: audit satisfies AuthenticationAuditRecorder,
      },
      { provide: TRANSACTION_BOUNDARY, useValue: boundary },
      { provide: CreateUserUseCase, useValue: createUser },
      { provide: SetUserCredentialUseCase, useValue: setCredential },
      { provide: SignUpUseCase, useValue: signUp },
      {
        provide: SignInUseCase,
        useValue: new SignInUseCase(
          users,
          credentials,
          sessions,
          hasher,
          tokens,
          audit,
          boundary,
          60,
          TEST_LOCKOUT_POLICY,
          new RecordingSecurityLogger(),
        ),
      },
      { provide: SignOutUseCase, useValue: new SignOutUseCase(sessions, audit, boundary) },
      {
        provide: GetAuthenticatedSessionUseCase,
        useValue: new GetAuthenticatedSessionUseCase(users, sessions, tokens, audit),
      },
      RateLimitGuard,
      {
        provide: RATE_LIMITER,
        useValue: {
          consume: async () => ({
            allowed: true,
            remaining: 99,
            limit: 100,
            resetAtMs: Date.now() + 60_000,
          }),
        },
      } as unknown as { provide: symbol; useValue: RateLimiter },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureApplication(app);
  await app.init();

  return { app, users, credentials, sessions, userEvents, audit };
}

describe('sign-up resource (e2e)', () => {
  let app: INestApplication;
  let harness: Harness;

  beforeAll(async () => {
    harness = await createHarness();
    app = harness.app;
  });

  afterAll(async () => {
    await app.close();
  });

  function server(): ReturnType<INestApplication['getHttpServer']> {
    return app.getHttpServer();
  }

  describe('a valid registration', () => {
    it('creates the user and its credential and answers with the public user shape', async () => {
      const email = `ali.${randomUUID()}@example.com`;

      const response = await request(server())
        .post('/api/v1/auth/sign-up')
        .send({ displayName: 'Ali Rezaei', email, password: PASSWORD })
        .expect(201);

      expect(response.body).toMatchObject({
        displayName: 'Ali Rezaei',
        email,
        status: 'active',
      });
      expect(response.body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(typeof response.body.revision).toBe('number');
      expect(typeof response.body.createdAt).toBe('string');

      // The user really persisted, and the credential is a salted, self-
      // describing hash — never the secret, and the algorithm names scrypt.
      const user = (await harness.users.findByEmail(email))!.aggregate;
      const stored = harness.credentials.stored(user.id);
      expect(stored).toBeDefined();
      expect(stored?.snapshot().passwordHash.startsWith('scrypt(')).toBe(true);
      expect(stored?.snapshot().passwordHash).not.toContain(PASSWORD);
      expect(harness.sessions.addCalls).toBe(0);
    });

    it('returns only the public user fields — no credential material', async () => {
      const response = await request(server())
        .post('/api/v1/auth/sign-up')
        .send({
          displayName: 'Public Fields',
          email: `keeper.${randomUUID()}@example.com`,
          password: PASSWORD,
        })
        .expect(201);

      expect(Object.keys(response.body).sort()).toEqual(
        ['createdAt', 'displayName', 'email', 'id', 'revision', 'status', 'updatedAt'].sort(),
      );

      const body = JSON.stringify(response.body);
      expect(body).not.toContain(PASSWORD);
      for (const forbidden of [
        'password',
        'passwordHash',
        'tokenHash',
        'token',
        'secret',
        'credential',
        'tenantId',
        'membership',
        'role',
        'permissions',
      ]) {
        expect(body.toLowerCase()).not.toContain(forbidden.toLowerCase());
      }
    });

    it('audits the registration through the existing boundaries only', async () => {
      await request(server())
        .post('/api/v1/auth/sign-up')
        .send({
          displayName: 'Audited',
          email: `aud.${randomUUID()}@example.com`,
          password: PASSWORD,
        })
        .expect(201);

      // The user fact rides the user boundary's recorder; the credential fact
      // rides the authentication boundary's audit recorder. One registration,
      // no third mechanism.
      expect(harness.userEvents.recorded.map((event) => event.name)).toContain('UserCreated');
      expect(harness.audit.names()).toContain('UserCredentialEstablished');
      expect(
        JSON.stringify(harness.audit.recorded[harness.audit.recorded.length - 1]),
      ).not.toContain(PASSWORD);
      expect(JSON.stringify(harness.userEvents.recorded)).not.toContain(PASSWORD);
    });
  });

  describe('rejected registrations', () => {
    it('answers a malformed request with the standard validation error and creates nothing', async () => {
      const usersBefore = harness.users.addCalls;
      const credentialsBefore = harness.credentials.addCalls;
      const eventsBefore = harness.userEvents.recorded.length;

      const response = await request(server())
        .post('/api/v1/auth/sign-up')
        .send({ email: 'not-an-email', password: '', tenantId: 'sneaky', role: 'admin' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      const fields = response.body.error.details.map((detail: { field: string }) => detail.field);
      expect(fields).toContain('displayName');
      expect(fields).toContain('email');
      expect(fields).toContain('password');

      expect(harness.users.addCalls).toBe(usersBefore);
      expect(harness.credentials.addCalls).toBe(credentialsBefore);
      expect(harness.userEvents.recorded).toHaveLength(eventsBefore);
    });

    it('refuses a password that breaks the policy before anything is created', async () => {
      const usersBefore = harness.users.addCalls;
      const credentialsBefore = harness.credentials.addCalls;

      const response = await request(server())
        .post('/api/v1/auth/sign-up')
        .send({
          displayName: 'Weak Secret',
          email: `weak.${randomUUID()}@example.com`,
          password: 'too-short',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(
        response.body.error.details.map((detail: { field: string }) => detail.field),
      ).toContain('password');
      // The submitted value is never echoed.
      expect(JSON.stringify(response.body)).not.toContain('too-short');
      expect(harness.users.addCalls).toBe(usersBefore);
      expect(harness.credentials.addCalls).toBe(credentialsBefore);
    });

    it('answers a duplicate email with the established conflict and creates no credential', async () => {
      const email = `taken.${randomUUID()}@example.com`;
      await request(server())
        .post('/api/v1/auth/sign-up')
        .send({ displayName: 'First', email, password: PASSWORD })
        .expect(201);

      const usersBefore = harness.users.addCalls;
      const credentialsBefore = harness.credentials.addCalls;
      const eventsBefore = harness.userEvents.recorded.length;

      const response = await request(server())
        .post('/api/v1/auth/sign-up')
        .send({ displayName: 'Second', email, password: 'a different secret entirely' })
        .expect(409);

      expect(response.body.error.code).toBe('CONFLICT');
      expect(harness.users.addCalls).toBe(usersBefore);
      expect(harness.credentials.addCalls).toBe(credentialsBefore);
      expect(harness.userEvents.recorded).toHaveLength(eventsBefore);
    });

    it('does not grant any tenant, membership, role or session side effect', async () => {
      const sessionsBefore = harness.sessions.addCalls;
      const eventsBefore = harness.userEvents.recorded.length;

      const response = await request(server())
        .post('/api/v1/auth/sign-up')
        .send({
          displayName: 'No Access Yet',
          email: `noaccess.${randomUUID()}@example.com`,
          password: PASSWORD,
        })
        .expect(201);

      expect(response.body).not.toHaveProperty('tenantId');
      expect(response.body).not.toHaveProperty('membership');
      expect(response.body).not.toHaveProperty('role');
      expect(harness.sessions.addCalls).toBe(sessionsBefore);

      // The only fact recorded is the registration's own.
      const eventNames = harness.userEvents.recorded.slice(eventsBefore).map((event) => event.name);
      expect(eventNames).toEqual(['UserCreated']);
    });
  });

  describe('the OpenAPI document', () => {
    it('declares sign-up as public and documents no credential field', async () => {
      const document = await request(server()).get('/api/docs-json').expect(200);

      expect(document.body.paths['/api/v1/auth/sign-up'].post).toBeDefined();
      // Like sign-in, registration is how an identity comes to exist, so it
      // requires none.
      expect(document.body.paths['/api/v1/auth/sign-up'].post.security).toBeUndefined();

      const schemas: Record<string, { properties?: Record<string, unknown> }> =
        document.body.components.schemas;
      const properties = Object.keys(schemas['SignUpResponseDto']?.properties ?? {});
      for (const forbidden of ['password', 'passwordHash', 'tokenHash', 'tenantId']) {
        expect(properties).not.toContain(forbidden);
      }
    });
  });
});
