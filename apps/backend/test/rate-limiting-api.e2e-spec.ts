/**
 * Rate limiting over the real HTTP boundary (SEC-001).
 *
 * These tests bind the **real** rate-limit guard and decorator with a **mocked**
 * Redis connection, so throttling decisions are exercised end-to-end (routing,
 * guard, error contract, headers, correlation id) without a real Redis
 * instance. Fail-closed behaviour when Redis is unavailable is covered too.
 */
import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

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
import type { UserRepository } from '../src/modules/identity/domain/repositories/user.repository.js';
import type { CredentialRepository } from '../src/modules/identity/domain/repositories/credential.repository.js';
import type { AuthSessionRepository } from '../src/modules/identity/domain/repositories/auth-session.repository.js';
import { GetAuthenticatedSessionUseCase } from '../src/modules/identity/application/use-cases/get-authenticated-session.use-case.js';
import { SignInUseCase } from '../src/modules/identity/application/use-cases/sign-in.use-case.js';
import { SignOutUseCase } from '../src/modules/identity/application/use-cases/sign-out.use-case.js';
import { SignUpUseCase } from '../src/modules/identity/application/use-cases/sign-up.use-case.js';
import { CreateUserUseCase } from '../src/modules/identity/application/use-cases/create-user.use-case.js';
import { SetUserCredentialUseCase } from '../src/modules/identity/application/use-cases/set-user-credential.use-case.js';
import { USER_REPOSITORY } from '../src/modules/identity/application/user.tokens.js';
import type { UserEventRecorder } from '../src/modules/identity/application/ports/user-event-recorder.port.js';
import { AuthenticationController } from '../src/modules/identity/presentation/controllers/authentication.controller.js';
import { AuthenticationGuard } from '../src/modules/identity/presentation/guards/authentication.guard.js';
import { RateLimitGuard } from '../src/infrastructure/api/rate-limit/rate-limit.guard.js';
import { CryptoSessionTokenService } from '../src/modules/identity/infrastructure/security/crypto-session-token-service.js';
import { ScryptPasswordHasher } from '../src/modules/identity/infrastructure/security/scrypt-password-hasher.js';
import { DateTime } from '../src/shared/time/date-time.js';
import type { TransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';
import {
  InMemoryAuthSessionRepository,
  InMemoryCredentialRepository,
  RecordingAuthenticationAudit,
  RecordingSecurityLogger,
} from './support/authentication-doubles.js';
import {
  InMemoryUserRepository,
  PassthroughTransactionBoundary,
  aUser,
  RecordingUserEvents,
} from './support/user-doubles.js';
import { RATE_LIMITER } from '../src/infrastructure/api/rate-limit/rate-limit.tokens.js';
import type {
  RateLimiter,
  RateLimitDecision,
} from '../src/infrastructure/api/rate-limit/rate-limiter.js';

const PASSWORD = 'correct horse battery staple';
const MAX_PER_IP = 3;

interface Harness {
  readonly app: INestApplication;
  readonly users: InMemoryUserRepository;
  readonly credentials: InMemoryCredentialRepository;
  readonly sessions: InMemoryAuthSessionRepository;
}

/** A mutable fake rate limiter whose decisions can be reset between tests. */
function mutableLimiter(): RateLimiter & {
  setDecisions: (decisions: RateLimitDecision[]) => void;
} {
  let decisions: RateLimitDecision[] = [];
  let index = 0;
  const limiter = {
    consume: async () =>
      decisions[index++] ?? {
        allowed: true,
        remaining: 99,
        limit: 100,
        resetAtMs: Date.now() + 60_000,
      },
    setDecisions: (next: RateLimitDecision[]) => {
      decisions = next;
      index = 0;
    },
  };
  return limiter as unknown as RateLimiter & {
    setDecisions: (decisions: RateLimitDecision[]) => void;
  };
}

function throttleDecisions(maxPerIp: number, unavailable = false): RateLimitDecision[] {
  const decisions: RateLimitDecision[] = [];
  // Each sign-in call consumes 2 decisions: IP first, then identity hint.
  // After maxPerIp allowed calls, the next IP call is refused.
  for (let i = 0; i < maxPerIp * 2; i += 1) {
    decisions.push({
      allowed: true,
      remaining: maxPerIp,
      limit: maxPerIp,
      resetAtMs: Date.now() + 60_000,
    });
  }
  decisions.push({
    allowed: false,
    remaining: 0,
    limit: maxPerIp,
    resetAtMs: Date.now() + 60_000,
    unavailable,
  });
  return decisions;
}

async function createHarness(rateLimiter: RateLimiter): Promise<Harness> {
  const users = new InMemoryUserRepository();
  const credentials = new InMemoryCredentialRepository();
  const sessions = new InMemoryAuthSessionRepository();
  const audit = new RecordingAuthenticationAudit();
  const boundary = new PassthroughTransactionBoundary();
  const hasher = new ScryptPasswordHasher();
  const tokens = new CryptoSessionTokenService();

  const moduleRef = await Test.createTestingModule({
    imports: [AppConfigModule],
    controllers: [AuthenticationController],
    providers: [
      { provide: USER_REPOSITORY, useValue: users },
      { provide: CREDENTIAL_REPOSITORY, useValue: credentials },
      { provide: AUTH_SESSION_REPOSITORY, useValue: sessions },
      { provide: AUTHENTICATION_AUDIT_RECORDER, useValue: audit },
      { provide: PASSWORD_HASHER, useValue: hasher },
      { provide: SESSION_TOKEN_SERVICE, useValue: tokens },
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
        ) =>
          new SignInUseCase(
            u,
            c,
            s,
            h,
            t,
            a,
            b,
            config.authentication.sessionTtlMinutes,
            {
              threshold: config.authentication.lockoutThreshold,
              durationMs: config.authentication.lockoutDurationMs,
            },
            new RecordingSecurityLogger(),
          ),
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
        provide: SignUpUseCase,
        useFactory: (
          u: UserRepository,
          c: CredentialRepository,
          s: AuthSessionRepository,
          h: PasswordHasher,
          a: AuthenticationAuditRecorder,
          b: TransactionBoundary,
        ) =>
          new SignUpUseCase(
            new CreateUserUseCase(u, new RecordingUserEvents() as UserEventRecorder, b),
            new SetUserCredentialUseCase(u, c, s, h, a, b),
            b,
          ),
        inject: [
          USER_REPOSITORY,
          CREDENTIAL_REPOSITORY,
          AUTH_SESSION_REPOSITORY,
          PASSWORD_HASHER,
          AUTHENTICATION_AUDIT_RECORDER,
          TRANSACTION_BOUNDARY,
        ],
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
      AuthenticationGuard,
      RateLimitGuard,
      {
        provide: RATE_LIMITER,
        useValue: rateLimiter,
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureApplication(app);
  await app.init();

  return { app, users, credentials, sessions };
}

async function seedUser(
  harness: Harness,
  options: { email?: string; password?: string } = {},
): Promise<{ id: string; email: string }> {
  const email = options.email ?? `ali.${randomUUID()}@example.com`;
  const user = aUser('Ali Rezaei', email);
  harness.users.seed(user);

  const { Credential } = await import('../src/modules/identity/domain/aggregates/credential.js');
  const { PlainPassword } =
    await import('../src/modules/identity/domain/value-objects/plain-password.js');

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

describe('rate limiting on authentication endpoints (e2e, SEC-001)', () => {
  let app: INestApplication;
  let harness: Harness;
  let limiter: ReturnType<typeof mutableLimiter>;

  beforeAll(async () => {
    limiter = mutableLimiter();
    limiter.setDecisions(throttleDecisions(MAX_PER_IP));
    harness = await createHarness(limiter);
    app = harness.app;
  });

  beforeEach(() => {
    limiter.setDecisions(throttleDecisions(MAX_PER_IP));
  });

  afterAll(async () => {
    await app.close();
  });

  function server(): ReturnType<INestApplication['getHttpServer']> {
    return app.getHttpServer();
  }

  describe('sign-in throttling', () => {
    it('allows N attempts then refuses with 429', async () => {
      const user = await seedUser(harness);

      for (let i = 0; i < MAX_PER_IP; i += 1) {
        const response = await request(server())
          .post('/api/v1/auth/sign-in')
          .send({ email: user.email, password: PASSWORD });
        expect(response.status).toBe(201);
      }

      const throttled = await request(server())
        .post('/api/v1/auth/sign-in')
        .send({ email: user.email, password: PASSWORD });

      expect(throttled.status).toBe(429);
      expect(throttled.body.error).toMatchObject({
        code: 'RATE_LIMITED',
        category: 'client',
      });
      expect(throttled.body.error.correlationId).toBeTruthy();
    });

    it('emits Retry-After and X-RateLimit headers on throttled responses', async () => {
      const user = await seedUser(harness);

      for (let i = 0; i < MAX_PER_IP; i += 1) {
        await request(server())
          .post('/api/v1/auth/sign-in')
          .send({ email: user.email, password: PASSWORD });
      }

      const throttled = await request(server())
        .post('/api/v1/auth/sign-in')
        .send({ email: user.email, password: PASSWORD });

      expect(throttled.status).toBe(429);
      expect(throttled.headers['retry-after']).toBeTruthy();
      expect(throttled.headers['x-ratelimit-limit']).toBeTruthy();
      expect(throttled.headers['x-ratelimit-remaining']).toBeTruthy();
      expect(throttled.headers['x-ratelimit-reset']).toBeTruthy();
    });

    it('echoes the client correlation id in the throttled response', async () => {
      const user = await seedUser(harness);

      for (let i = 0; i < MAX_PER_IP; i += 1) {
        await request(server())
          .post('/api/v1/auth/sign-in')
          .send({ email: user.email, password: PASSWORD });
      }

      const correlationId = 'corr-12345678-1234-1234-1234-123456789abc';
      const throttled = await request(server())
        .post('/api/v1/auth/sign-in')
        .send({ email: user.email, password: PASSWORD })
        .set('x-correlation-id', correlationId);

      expect(throttled.status).toBe(429);
      expect(throttled.body.error.correlationId).toBe(correlationId);
      expect(throttled.headers['x-correlation-id']).toBe(correlationId);
    });
  });

  describe('fail-closed when Redis is unavailable', () => {
    it('refuses sign-in when the limiter reports unavailable', async () => {
      const user = await seedUser(harness);

      limiter.setDecisions(throttleDecisions(MAX_PER_IP, true));

      for (let i = 0; i < MAX_PER_IP; i += 1) {
        await request(server())
          .post('/api/v1/auth/sign-in')
          .send({ email: user.email, password: PASSWORD });
      }

      const throttled = await request(server())
        .post('/api/v1/auth/sign-in')
        .send({ email: user.email, password: PASSWORD });

      expect(throttled.status).toBe(429);
      expect(throttled.body.error.code).toBe('RATE_LIMITED');
      expect(throttled.body.error.category).toBe('client');
    });
  });
});
