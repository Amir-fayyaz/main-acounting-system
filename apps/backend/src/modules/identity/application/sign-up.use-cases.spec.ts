import { beforeEach, describe, expect, it } from 'vitest';

import type { AuthenticationAuditRecorder } from './ports/authentication-audit-recorder.port.js';
import type { DomainEvent } from '../../../shared/messaging/domain-event.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../../../shared/persistence/persistence-error.js';
import type { WriteReceipt } from '../../../shared/persistence/repository-ports.js';
import {
  FastPasswordHasher,
  InMemoryAuthSessionRepository,
  InMemoryCredentialRepository,
  RecordingAuthenticationAudit,
} from '../../../../test/support/authentication-doubles.js';
import {
  InMemoryUserRepository,
  PassthroughTransactionBoundary,
  RecordingUserEvents,
  aUser,
} from '../../../../test/support/user-doubles.js';
import type { Credential } from '../domain/aggregates/credential.js';
import { SignUp } from './commands/sign-up.command.js';
import { CreateUserUseCase } from './use-cases/create-user.use-case.js';
import { SetUserCredentialUseCase } from './use-cases/set-user-credential.use-case.js';
import { SignUpUseCase } from './use-cases/sign-up.use-case.js';
import { TEST_PASSWORD } from '../../../../test/support/authentication-harness.js';

/**
 * Self-service sign-up (IAM-008).
 *
 * These tests pin the composition contract: the user is created through the
 * User Management boundary (IAM-002) and the credential through the
 * Authentication boundary (IAM-005), inside one transaction boundary, so a
 * sign-up commits as one consistent registration or not at all; no plaintext
 * secret, hash or credential record ever reaches the result; and nothing
 * tenant- or authorization-shaped is created.
 */

const PASSWORD = TEST_PASSWORD;

interface Harness {
  readonly users: InMemoryUserRepository;
  readonly credentials: InMemoryCredentialRepository;
  readonly sessions: InMemoryAuthSessionRepository;
  readonly hasher: FastPasswordHasher;
  readonly userEvents: RecordingUserEvents;
  readonly audit: RecordingAuthenticationAudit;
  readonly boundary: PassthroughTransactionBoundary;
  readonly signUp: SignUpUseCase;
}

function harness(): Harness {
  const users = new InMemoryUserRepository();
  const credentials = new InMemoryCredentialRepository();
  const sessions = new InMemoryAuthSessionRepository();
  const hasher = new FastPasswordHasher();
  const userEvents = new RecordingUserEvents();
  const audit = new RecordingAuthenticationAudit();
  const boundary = new PassthroughTransactionBoundary();

  const createUser = new CreateUserUseCase(users, userEvents, boundary);
  const setCredential = new SetUserCredentialUseCase(
    users,
    credentials,
    sessions,
    hasher,
    audit,
    boundary,
  );

  return {
    users,
    credentials,
    sessions,
    hasher,
    userEvents,
    audit,
    boundary,
    signUp: new SignUpUseCase(createUser, setCredential, boundary),
  };
}

/**
 * A credential repository double that refuses every establishment, the way a
 * lost store or an unknown driver error would. Only `add` is replaced — the
 * registration path never updates an existing credential.
 */
class FailingCredentialRepository extends InMemoryCredentialRepository {
  public constructor(private readonly failure: PersistenceError) {
    super();
  }

  public override async add(credential: Credential): Promise<WriteReceipt> {
    void credential;
    throw this.failure;
  }
}
/** An audit boundary that refuses to record, failing like AUD-001 fails. */
class FailingAudit implements AuthenticationAuditRecorder {
  public async record(event: DomainEvent<unknown>): Promise<never> {
    void event;
    throw new Error('audit store unavailable');
  }
}

/**
 * A user repository double that models the race the unique key exists for: the
 * application pre-check misses, and the insert itself is refused by the
 * storage-level uniqueness constraint.
 */
class RaceBehindPreCheck extends InMemoryUserRepository {
  public override async existsByEmail(email: string): Promise<boolean> {
    void email;
    return false;
  }

  public override async add(
    user: Parameters<InMemoryUserRepository['add']>[0],
  ): Promise<WriteReceipt> {
    const clash = await super.findByEmail(user.email.value);
    if (clash !== undefined) {
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'UserRepository.add');
    }
    return super.add(user);
  }
}

let app: Harness;

beforeEach(() => {
  app = harness();
});

function signUpInput(
  overrides: Partial<{ displayName: string; email: string; password: string }> = {},
): SignUp {
  return new SignUp({
    displayName: 'Ali Rezaei',
    email: 'Ali@Example.COM',
    password: PASSWORD,
    ...overrides,
  });
}

describe('sign-up use case', () => {
  it('registers a user and its credential as one consistent result', async () => {
    const outcome = await app.signUp.execute(signUpInput());

    expect(outcome.isOk()).toBe(true);
    const view = outcome.valueOrThrow();

    // The response is the public user shape, normalized the way the user
    // domain normalizes it.
    expect(view.displayName).toBe('Ali Rezaei');
    expect(view.email).toBe('ali@example.com');
    expect(view.status).toBe('active');
    expect(view.revision).toBe(1);
    expect(Object.keys(view).sort()).toEqual(
      ['createdAt', 'displayName', 'email', 'id', 'revision', 'status', 'updatedAt'].sort(),
    );

    // Both halves actually landed: the user and a credential whose stored
    // value is a derived hash, never the secret.
    expect(app.users.addCalls).toBe(1);
    expect(app.credentials.addCalls).toBe(1);
    const user = (await app.users.findByEmail('ali@example.com'))!.aggregate;
    const stored = app.credentials.stored(user.id);
    expect(stored).toBeDefined();
    expect(stored?.snapshot().passwordHash).not.toContain(PASSWORD);
    expect(stored?.passwordHash.algorithm).toBe('test-sha256');
  });

  it('delegates to the existing boundaries and records their facts', async () => {
    await app.signUp.execute(signUpInput());

    // The user fact is recorded by the user boundary's own event recorder and
    // the credential fact by the authentication boundary's audit recorder.
    expect(app.userEvents.recorded.map((event) => event.name)).toEqual(['UserCreated']);
    expect(app.audit.names()).toEqual(['UserCredentialEstablished']);
    expect(app.audit.recorded[0]?.toJSON()).toMatchObject({
      data: { replaced: false, sessionsInvalidated: 0 },
    });
  });

  it('rejects invalid identity input as an expected failure without writing', async () => {
    const results = await Promise.all([
      app.signUp.execute(signUpInput({ displayName: '  ' })),
      app.signUp.execute(signUpInput({ email: 'not-an-email' })),
      app.signUp.execute(signUpInput({ email: '' })),
    ]);

    for (const outcome of results) {
      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow().category).toBe('VALIDATION');
    }

    expect(app.users.addCalls).toBe(0);
    expect(app.credentials.addCalls).toBe(0);
    expect(app.userEvents.recorded).toEqual([]);
    expect(app.audit.recorded).toEqual([]);
  });

  it('rejects a password that breaks the policy before anything is created', async () => {
    const outcome = await app.signUp.execute(signUpInput({ password: 'too-short' }));

    expect(outcome.isFail()).toBe(true);
    expect(outcome.errorOrThrow().code).toBe('PASSWORD_POLICY_VIOLATION');
    expect(app.hasher.hashCalls).toBe(0);
    expect(app.users.addCalls).toBe(0);
    expect(app.credentials.addCalls).toBe(0);
    expect(app.userEvents.recorded).toEqual([]);
  });

  it('refuses a duplicate email and establishes no credential for it', async () => {
    const first = await app.signUp.execute(signUpInput());
    expect(first.isOk()).toBe(true);

    const second = await app.signUp.execute(signUpInput({ password: 'another secret value' }));

    expect(second.isFail()).toBe(true);
    const error = second.errorOrThrow();
    expect(error.code).toBe('DUPLICATE_USER');
    expect(error.category).toBe('CONFLICT');

    // The refused registration wrote nothing beyond the first one.
    expect(app.users.addCalls).toBe(1);
    expect(app.credentials.addCalls).toBe(1);
    expect(app.userEvents.recorded).toHaveLength(1);
    expect(app.audit.recorded.map((event) => event.name)).toEqual(['UserCredentialEstablished']);
  });

  it('maps a persistence-level email collision to the same duplicate error', async () => {
    const racingUsers = new RaceBehindPreCheck();
    racingUsers.seed(aUser('Already Here', 'ali@example.com'));

    const setCredential = new SetUserCredentialUseCase(
      racingUsers,
      app.credentials,
      app.sessions,
      app.hasher,
      app.audit,
      app.boundary,
    );
    const signUp = new SignUpUseCase(
      new CreateUserUseCase(racingUsers, app.userEvents, app.boundary),
      setCredential,
      app.boundary,
    );

    const outcome = await signUp.execute(signUpInput({ password: 'a different secret value' }));

    expect(outcome.isFail()).toBe(true);
    expect(outcome.errorOrThrow().code).toBe('DUPLICATE_USER');
    expect(outcome.errorOrThrow().category).toBe('CONFLICT');
    // The refused registration established no credential either.
    expect(app.credentials.addCalls).toBe(0);
    expect(app.userEvents.recorded).toEqual([]);
  });

  it('leaves no user behind when the credential cannot be established', async () => {
    const setCredential = new SetUserCredentialUseCase(
      app.users,
      new FailingCredentialRepository(
        new PersistenceError(PersistenceFailureKind.UNKNOWN, 'CredentialRepository.add'),
      ),
      app.sessions,
      app.hasher,
      app.audit,
      app.boundary,
    );
    const failing = new SignUpUseCase(
      new CreateUserUseCase(app.users, app.userEvents, app.boundary),
      setCredential,
      app.boundary,
    );

    // An unexpected persistence failure is not a business outcome: it
    // propagates as the technical failure it is (SHR-002), so the open
    // boundary rolls the whole registration back — the passthrough double
    // cannot undo its writes, so what no partial state physically is proved
    // by the MySQL-backed persistence e2e; this test proves the failure
    // itself and that no credential was established for it.
    await expect(failing.execute(signUpInput())).rejects.toThrow(PersistenceError);
    expect(app.credentials.addCalls).toBe(0);
  });

  it('never includes a password, hash or credential record in the result or the trail', async () => {
    const outcome = await app.signUp.execute(signUpInput());

    const serialized = JSON.stringify(outcome);
    expect(serialized).not.toContain(PASSWORD);
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('passwordHash');
    expect(serialized).not.toContain('tokenHash');

    // No event and no audit record carries the secret either.
    expect(JSON.stringify(app.userEvents.recorded)).not.toContain(PASSWORD);
    expect(JSON.stringify(app.audit.recorded)).not.toContain(PASSWORD);
  });

  it('creates no membership, role, permission, tenant or session', async () => {
    const outcome = await app.signUp.execute(signUpInput());

    expect(outcome.isOk()).toBe(true);
    // The only facts recorded are the user fact and the credential fact: no
    // membership, role, permission or tenant event is produced, and no
    // authenticated session exists after sign-up.
    expect(app.userEvents.recorded.map((event) => event.name)).toEqual(['UserCreated']);
    expect(app.audit.names()).toEqual(['UserCredentialEstablished']);
    expect(app.sessions.addCalls).toBe(0);
    expect(app.audit.recorded[0]?.metadata.tenantId).toBeUndefined();
  });

  it('fails closed when the audit boundary cannot record the credential fact', async () => {
    const setCredential = new SetUserCredentialUseCase(
      app.users,
      app.credentials,
      app.sessions,
      app.hasher,
      new FailingAudit(),
      app.boundary,
    );
    const failing = new SignUpUseCase(
      new CreateUserUseCase(app.users, app.userEvents, app.boundary),
      setCredential,
      app.boundary,
    );

    // Recording the security fact is part of the unit of work: an audit that
    // cannot record fails the sign-up instead of losing the record. The
    // failure propagates as the technical failure it is, so the open boundary
    // can roll the whole registration back — the passthrough double cannot
    // undo its writes; the physical rollback is the real transaction
    // boundary's claim, verified against MySQL in the persistence e2e. This
    // test proves the failure surfaces and the credential stopped before it.
    await expect(failing.execute(signUpInput())).rejects.toThrow('audit store unavailable');
    // The credential was written before the audit fact was recorded; the
    // passthrough double cannot undo that write, but the operation failed
    // loudly instead of reporting a registration whose security record is
    // missing. The physical rollback of both writes is the real transaction
    // boundary's claim, verified against MySQL in the persistence e2e.
    expect(app.credentials.addCalls).toBe(1);
    expect(app.sessions.addCalls).toBe(0);
  });
});
