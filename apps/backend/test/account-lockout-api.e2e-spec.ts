/**
 * Account lockout over the real HTTP boundary (SEC-002).
 *
 * These tests bind the **real** sign-in use case, the real session validation
 * and the real error mapping with **in-memory** repositories, so the lockout is
 * exercised end-to-end — routing, domain state, audit records, response contract
 * — without a database. The threshold and the duration come from the same typed
 * configuration the process loads, so the configured keys are exercised too.
 *
 * What they deliberately do not cover: the two persisted columns. That is the
 * user repository adapter's own concern and is verified where a database is
 * available.
 */
import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { configureApplication } from '../src/bootstrap.js';
import { LOGGER } from '../src/infrastructure/logging/logging.tokens.js';
import { SILENT_LOGGER } from './support/logging-doubles.js';
import { APP_CONFIGURATION } from '../src/infrastructure/config/app-config.tokens.js';
import { AppConfigService } from '../src/infrastructure/config/app-config.service.js';
import { loadConfiguration } from '../src/infrastructure/config/configuration.js';
import { TRANSACTION_BOUNDARY } from '../src/infrastructure/database/database.tokens.js';
import { RATE_LIMITER } from '../src/infrastructure/api/rate-limit/rate-limit.tokens.js';
import type { RateLimiter } from '../src/infrastructure/api/rate-limit/rate-limiter.js';
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
import { Credential } from '../src/modules/identity/domain/aggregates/credential.js';
import { PlainPassword } from '../src/modules/identity/domain/value-objects/plain-password.js';
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
  RecordingUserEvents,
  aUser,
} from './support/user-doubles.js';

const PASSWORD = 'correct horse battery staple';
const THRESHOLD = 2;
/**
 * Long enough to outlive the credential work between two HTTP requests.
 *
 * Every sign-in runs a real scrypt derivation (~300 ms), so a short window would
 * expire while the *next* request is still being verified and the test would
 * prove nothing about the lockout.
 */
const LOCKOUT_DURATION_MS = 2_500;

const CONFIGURATION: Readonly<Record<string, unknown>> = {
  NODE_ENV: 'test',
  AUTH_LOCKOUT_THRESHOLD: String(THRESHOLD),
  AUTH_LOCKOUT_DURATION_MS: String(LOCKOUT_DURATION_MS),
};

interface Harness {
  readonly app: INestApplication;
  readonly users: InMemoryUserRepository;
  readonly credentials: InMemoryCredentialRepository;
  readonly audit: RecordingAuthenticationAudit;
  readonly securityLog: RecordingSecurityLogger;
}

/**
 * A limiter that never throttles, so these tests exercise the lockout and not
 * SEC-001: the two mechanisms are complementary and must not obscure each other.
 */
const allowingLimiter: RateLimiter = {
  consume: async () => ({
    allowed: true,
    remaining: 99,
    limit: 100,
    resetAtMs: Date.now() + 60_000,
  }),
};

async function createHarness(): Promise<Harness> {
  const users = new InMemoryUserRepository();
  const credentials = new InMemoryCredentialRepository();
  const sessions = new InMemoryAuthSessionRepository();
  const audit = new RecordingAuthenticationAudit();
  const securityLog = new RecordingSecurityLogger();
  const boundary = new PassthroughTransactionBoundary();
  const hasher = new ScryptPasswordHasher();
  const tokens = new CryptoSessionTokenService();

  const moduleRef = await Test.createTestingModule({
    controllers: [AuthenticationController],
    providers: [
      { provide: LOGGER, useValue: SILENT_LOGGER },
      { provide: APP_CONFIGURATION, useValue: loadConfiguration(CONFIGURATION) },
      AppConfigService,
      { provide: USER_REPOSITORY, useValue: users },
      { provide: CREDENTIAL_REPOSITORY, useValue: credentials },
      { provide: AUTH_SESSION_REPOSITORY, useValue: sessions },
      { provide: AUTHENTICATION_AUDIT_RECORDER, useValue: audit },
      { provide: PASSWORD_HASHER, useValue: hasher },
      { provide: SESSION_TOKEN_SERVICE, useValue: tokens },
      { provide: TRANSACTION_BOUNDARY, useValue: boundary },
      { provide: RATE_LIMITER, useValue: allowingLimiter },
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
            securityLog,
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
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureApplication(app);
  await app.init();

  return { app, users, credentials, audit, securityLog };
}

/** Seeds an active user and the credential it signs in with. */
async function seedUser(harness: Harness): Promise<{ id: string; email: string }> {
  const email = `ali.${randomUUID()}@example.com`;
  const user = aUser('Ali Rezaei', email);
  harness.users.seed(user);

  const credential = Credential.create({
    userId: user.id,
    passwordHash: await new ScryptPasswordHasher().hash(PlainPassword.from(PASSWORD)),
    now: DateTime.now(),
  });
  harness.credentials.seed(credential);

  return { id: user.id.value, email: user.email.value };
}

describe('account lockout on authentication endpoints (e2e, SEC-002)', () => {
  let harness: Harness;

  beforeEach(async () => {
    harness = await createHarness();
  });

  afterEach(async () => {
    await harness.app.close();
  });

  function server(): ReturnType<INestApplication['getHttpServer']> {
    return harness.app.getHttpServer();
  }

  function signIn(email: string, password: string) {
    return request(server()).post('/api/v1/auth/sign-in').send({ email, password });
  }

  /** Fails `count` times, which is how an account is driven to its threshold. */
  async function failTimes(email: string, count: number): Promise<void> {
    for (let attempt = 0; attempt < count; attempt += 1) {
      const failure = await signIn(email, 'not the stored secret');
      expect(failure.status).toBe(401);
      expect(failure.body.error.code).toBe('INVALID_CREDENTIALS');
    }
  }

  it('locks the account after the threshold and refuses the next attempt', async () => {
    const user = await seedUser(harness);

    await failTimes(user.email, THRESHOLD);

    const locked = await signIn(user.email, PASSWORD);

    expect(locked.status).toBe(401);
    expect(locked.body.error).toMatchObject({
      code: 'ACCOUNT_LOCKED_OUT',
      category: 'client',
      message: 'This account is temporarily unavailable. Try again later or reset the password.',
    });

    // The refusal discloses neither the threshold nor the remaining time: the
    // error carries a code, a stable message and the correlation id, nothing else.
    expect(Object.keys(locked.body.error).sort()).toEqual([
      'category',
      'code',
      'correlationId',
      'message',
    ]);
    expect(locked.body.error.details).toBeUndefined();
    expect(locked.body.error.retryAfter).toBeUndefined();
  });

  it('answers a locked account the same way for a right and a wrong secret', async () => {
    const user = await seedUser(harness);

    await failTimes(user.email, THRESHOLD);

    const wrongSecret = await signIn(user.email, 'still not the stored secret');
    const rightSecret = await signIn(user.email, PASSWORD);

    expect(wrongSecret.status).toBe(rightSecret.status);
    expect(wrongSecret.body.error.code).toBe(rightSecret.body.error.code);
    expect(wrongSecret.body.error.message).toBe(rightSecret.body.error.message);
  });

  it('records the lockout in the audit trail and the structured signal, without the credential', async () => {
    const user = await seedUser(harness);

    await failTimes(user.email, THRESHOLD);
    await signIn(user.email, PASSWORD);

    expect(harness.audit.names()).toContain('UserAccountLocked');
    expect(harness.audit.names()).toContain('LockedOutAccountTargeted');
    expect(JSON.stringify(harness.audit.recorded)).not.toContain(PASSWORD);
    expect(JSON.stringify(harness.audit.recorded)).not.toContain('not the stored secret');

    expect(harness.securityLog.transitions).toHaveLength(1);
    expect(harness.securityLog.transitions[0]).toMatchObject({
      userId: user.id,
      threshold: THRESHOLD,
      durationMs: LOCKOUT_DURATION_MS,
    });
    expect(harness.securityLog.attempts).toHaveLength(1);
    expect(harness.securityLog.attempts[0]?.userId).toBe(user.id);
  });

  // Wall-clock test: it really waits out the lockout window and derives scrypt
  // hashes on every attempt, so it needs more than the default 5s under load.
  it('accepts attempts again once the lockout duration has elapsed', async () => {
    const user = await seedUser(harness);

    await failTimes(user.email, THRESHOLD);
    expect((await signIn(user.email, PASSWORD)).status).toBe(401);

    await new Promise((resolve) => setTimeout(resolve, LOCKOUT_DURATION_MS + 200));

    const recovered = await signIn(user.email, PASSWORD);
    expect(recovered.status).toBe(201);
    expect(recovered.body.token).toBeTruthy();
  }, 15_000);

  it('resets the counter when a success happens before the threshold', async () => {
    const user = await seedUser(harness);

    await failTimes(user.email, 1);
    expect((await signIn(user.email, PASSWORD)).status).toBe(201);

    // The counter restarted from zero, so one more failure is not a lockout.
    await failTimes(user.email, 1);
    expect((await signIn(user.email, PASSWORD)).status).toBe(201);
  });

  it('refuses an already-established session while the account is locked', async () => {
    const user = await seedUser(harness);

    const signedIn = await signIn(user.email, PASSWORD);
    expect(signedIn.status).toBe(201);
    const token = signedIn.body.token as string;

    const accepted = await request(server())
      .get('/api/v1/auth/session')
      .set('authorization', `Bearer ${token}`);
    expect(accepted.status).toBe(200);

    await failTimes(user.email, THRESHOLD);

    const refused = await request(server())
      .get('/api/v1/auth/session')
      .set('authorization', `Bearer ${token}`);

    expect(refused.status).toBe(401);
    expect(refused.body.error.code).toBe('ACCOUNT_LOCKED_OUT');
  });
});
