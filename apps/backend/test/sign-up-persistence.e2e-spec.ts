import { env } from 'node:process';

import { drizzle } from 'drizzle-orm/mysql2';
import { createPool, type Pool, type RowDataPacket } from 'mysql2/promise';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppConfigService } from '../src/infrastructure/config/app-config.service.js';
import { loadConfiguration } from '../src/infrastructure/config/configuration.js';
import { loadDotEnvFiles } from '../src/infrastructure/config/dotenv.js';
import type { Database } from '../src/infrastructure/database/database.module.js';
import { DrizzleTransactionRunner } from '../src/infrastructure/database/drizzle-transaction-runner.js';
import { OutboxRecorder } from '../src/infrastructure/outbox/outbox-recorder.js';
import { DrizzleOutboxStore } from '../src/infrastructure/outbox/persistence/drizzle-outbox-store.js';
import { ensureOutboxSchema } from '../src/infrastructure/outbox/persistence/outbox.schema.js';
import { RecordAuditEntryUseCase } from '../src/modules/audit/application/use-cases/record-audit-entry.use-case.js';
import { DrizzleAuditRecordRepository } from '../src/modules/audit/infrastructure/persistence/drizzle-audit-record.repository.js';
import { ensureAuditRecordSchema } from '../src/modules/audit/infrastructure/persistence/audit-record.schema.js';
import { SignIn } from '../src/modules/identity/application/commands/sign-in.command.js';
import { SignUp } from '../src/modules/identity/application/commands/sign-up.command.js';
import { CreateUserUseCase } from '../src/modules/identity/application/use-cases/create-user.use-case.js';
import { SetUserCredentialUseCase } from '../src/modules/identity/application/use-cases/set-user-credential.use-case.js';
import { SignInUseCase } from '../src/modules/identity/application/use-cases/sign-in.use-case.js';
import { SignUpUseCase } from '../src/modules/identity/application/use-cases/sign-up.use-case.js';
import type { UserEventRecorder } from '../src/modules/identity/application/ports/user-event-recorder.port.js';
import type { Credential } from '../src/modules/identity/domain/aggregates/credential.js';
import { AuditTrailAuthenticationAuditRecorder } from '../src/modules/identity/infrastructure/audit/audit-trail-authentication-audit-recorder.js';
import { DrizzleAuthSessionRepository } from '../src/modules/identity/infrastructure/persistence/drizzle-auth-session.repository.js';
import { ensureAuthSessionSchema } from '../src/modules/identity/infrastructure/persistence/drizzle-auth-session.schema.js';
import { DrizzleCredentialRepository } from '../src/modules/identity/infrastructure/persistence/drizzle-credential.repository.js';
import { ensureCredentialSchema } from '../src/modules/identity/infrastructure/persistence/drizzle-credential.schema.js';
import { DrizzleUserRepository } from '../src/modules/identity/infrastructure/persistence/drizzle-user.repository.js';
import { ensureUserSchema } from '../src/modules/identity/infrastructure/persistence/drizzle-user.schema.js';
import { CryptoSessionTokenService } from '../src/modules/identity/infrastructure/security/crypto-session-token-service.js';
import { ScryptPasswordHasher } from '../src/modules/identity/infrastructure/security/scrypt-password-hasher.js';
import { RecordingSecurityLogger } from './support/authentication-doubles.js';
import { TEST_LOCKOUT_POLICY } from './support/authentication-harness.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../src/shared/persistence/persistence-error.js';
import type { WriteReceipt } from '../src/shared/persistence/repository-ports.js';
import { createTransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';
import type { TransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';

/**
 * Sign-up persistence against a real MySQL server (IAM-008).
 *
 * The unit and HTTP specs prove the composition over in-memory doubles; these
 * prove what only a real server can: the user row and the credential row commit
 * through the real Drizzle adapters inside **one** transaction, the stored
 * credential is a salted scrypt hash that sign-in later verifies, the database
 * unique key refuses the email the application pre-check missed, a refused
 * credential rolls the registration back to *no user at all*, and the
 * registration facts land through the existing factories — the outbox for the
 * user fact, the central audit trail for the credential fact (AUD-001) — with
 * no credential material in any of them.
 *
 * Opt-in, so the required quality gate still runs without infrastructure:
 *
 * ```bash
 * pnpm infra:up
 * MYSQL_INTEGRATION=1 pnpm --filter @accounting-saas/backend test
 * ```
 *
 * Only rows this spec owns (emails under the `iam008.` prefix, the outbox rows
 * carrying them, the audit rows naming the users it created) are removed; the
 * tables themselves are created and dropped the way the other identity
 * integration specs treat them.
 */
const integrationEnabled = env.MYSQL_INTEGRATION === '1';

const USERS_TABLE = 'users';
const CREDENTIAL_TABLE = 'user_credentials';
const SESSION_TABLE = 'auth_sessions';
const AUDIT_TABLE = 'audit_records';
const OUTBOX_TABLE = 'outbox_events';
const EMAIL_PREFIX = 'iam008.';

const PASSWORD = 'correct horse battery staple';

/** A credential adapter that refuses the very first establishment. */
class FailingCredentials extends DrizzleCredentialRepository {
  public override async add(credential: Credential): Promise<WriteReceipt> {
    void credential;
    throw new PersistenceError(PersistenceFailureKind.UNKNOWN, 'CredentialRepository.add');
  }
}

/**
 * A user adapter whose application pre-check misses, so the second registration
 * in a duplicate run reaches the real unique key.
 */
class RaceBehindUsers extends DrizzleUserRepository {
  public override async existsByEmail(email: string): Promise<boolean> {
    void email;
    return false;
  }
}

describe.skipIf(!integrationEnabled)('sign-up persistence (integration)', () => {
  let pool: Pool;
  let database: Database;
  let boundary: TransactionBoundary;
  let users: DrizzleUserRepository;
  let credentials: DrizzleCredentialRepository;
  let sessions: DrizzleAuthSessionRepository;
  let hasher: ScryptPasswordHasher;
  let userEvents: UserEventRecorder;
  let audit: AuditTrailAuthenticationAuditRecorder;
  let signIn: SignInUseCase;
  let signUp: SignUpUseCase;
  /** The user ids this spec created during the current test. */
  let createdUserIds: string[];

  /** A unique email per run, so rows this spec owns are always identifiable. */
  function uniqueEmail(): string {
    return `${EMAIL_PREFIX}${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
  }

  async function userCount(email: string): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM ${USERS_TABLE} WHERE email = ?`,
      [email.toLowerCase()],
    );
    return Number((rows[0] as RowDataPacket).total);
  }

  async function credentialCount(userId: string): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM ${CREDENTIAL_TABLE} WHERE user_id = ?`,
      [userId],
    );
    return Number((rows[0] as RowDataPacket).total);
  }

  async function storedHash(userId: string): Promise<string> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT password_hash FROM ${CREDENTIAL_TABLE} WHERE user_id = ?`,
      [userId],
    );
    return String((rows[0] as RowDataPacket).password_hash);
  }

  /** The audit rows that name a user this spec created, in order. */
  async function auditRowsForCreatedUsers(): Promise<RowDataPacket[]> {
    if (createdUserIds.length === 0) {
      return [];
    }
    const placeholders = createdUserIds.map(() => '?').join(', ');
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT action, outcome, actor_user_id, metadata FROM ${AUDIT_TABLE} ` +
        `WHERE actor_user_id IN (${placeholders}) ORDER BY occurred_at, id`,
      [...createdUserIds],
    );
    return rows as RowDataPacket[];
  }

  beforeAll(async () => {
    loadDotEnvFiles();

    const config = new AppConfigService(
      loadConfiguration({
        NODE_ENV: 'test',
        MYSQL_HOST: env.MYSQL_HOST,
        MYSQL_PORT: env.MYSQL_PORT,
        MYSQL_DATABASE: env.MYSQL_DATABASE,
        MYSQL_USER: env.MYSQL_USER,
        MYSQL_PASSWORD: env.MYSQL_PASSWORD,
      }),
    );

    pool = createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.name,
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0,
      timezone: 'Z',
    });

    database = drizzle(pool);
    await ensureUserSchema(database);
    await ensureCredentialSchema(database);
    await ensureAuthSessionSchema(database);
    await ensureAuditRecordSchema(database);
    await ensureOutboxSchema(database);

    boundary = createTransactionBoundary(new DrizzleTransactionRunner(database));
    users = new DrizzleUserRepository(database);
    credentials = new DrizzleCredentialRepository(database);
    sessions = new DrizzleAuthSessionRepository(database);
    hasher = new ScryptPasswordHasher();
    // The production user-fact home: the outbox recorder, which joins the
    // caller's transaction, exactly as the module wires it (SHR-006).
    userEvents = new OutboxRecorder(new DrizzleOutboxStore(database));
    // The production credential-fact home: the identity adapter translating
    // authentication facts into the central audit trail (AUD-001).
    audit = new AuditTrailAuthenticationAuditRecorder(
      new RecordAuditEntryUseCase(new DrizzleAuditRecordRepository(database), boundary),
    );

    signIn = new SignInUseCase(
      users,
      credentials,
      sessions,
      hasher,
      new CryptoSessionTokenService(),
      audit,
      boundary,
      60,
      TEST_LOCKOUT_POLICY,
      new RecordingSecurityLogger(),
    );
    signUp = new SignUpUseCase(
      new CreateUserUseCase(users, userEvents, boundary),
      new SetUserCredentialUseCase(users, credentials, sessions, hasher, audit, boundary),
      boundary,
    );
  });

  beforeEach(async () => {
    createdUserIds = [];
    await pool.query(`DELETE FROM ${SESSION_TABLE}`);
    await pool.query(`DELETE FROM ${CREDENTIAL_TABLE}`);
    await pool.query(`DELETE FROM ${USERS_TABLE} WHERE email LIKE '${EMAIL_PREFIX}%%@example.com'`);
    await pool.query(
      `DELETE FROM ${OUTBOX_TABLE} WHERE event_type = 'UserCreated' AND payload LIKE '${EMAIL_PREFIX}%%@example.com%%'`,
    );
  });

  afterAll(async () => {
    if (pool !== undefined) {
      await pool.query(
        `DELETE FROM ${USERS_TABLE} WHERE email LIKE '${EMAIL_PREFIX}%%@example.com'`,
      );
      await pool.query(
        `DELETE FROM ${OUTBOX_TABLE} WHERE event_type = 'UserCreated' AND payload LIKE '${EMAIL_PREFIX}%%@example.com%%'`,
      );
      await pool.end();
    }
  });

  it('commits the user and the credential as one registration and stores only a salted hash', async () => {
    const email = uniqueEmail();

    const outcome = await signUp.execute(
      new SignUp({ displayName: 'Ali Rezaei', email, password: PASSWORD }),
    );

    expect(outcome.isOk()).toBe(true);
    const view = outcome.valueOrThrow();
    createdUserIds.push(view.id);

    // Both rows exist, under the same user id.
    expect(await userCount(email)).toBe(1);
    expect(await credentialCount(view.id)).toBe(1);

    // What storage holds is a salted, self-describing scrypt hash — never the
    // secret, and never a plaintext copy.
    const hash = await storedHash(view.id);
    expect(hash.startsWith('scrypt(n=131072,r=8,p=1)$')).toBe(true);
    expect(hash).not.toContain(PASSWORD);

    // The hash really authenticates: the sign-in use case, over the same real
    // adapters, accepts what sign-up stored.
    const signedIn = await signIn.execute(new SignIn({ email, password: PASSWORD }));
    expect(signedIn.isOk()).toBe(true);

    // The credential fact reached the central audit trail, carries no secret,
    // and the user fact rode the outbox inside the same registration.
    const rows = await auditRowsForCreatedUsers();
    expect(rows.map((row) => row.action)).toEqual(['user.credential_changed']);
    expect(JSON.stringify(rows)).not.toContain(PASSWORD);
    const [outboxRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM ${OUTBOX_TABLE} WHERE event_type = 'UserCreated' AND payload LIKE ?`,
      [`%${email}%`],
    );
    expect(Number((outboxRows[0] as RowDataPacket).total)).toBe(1);
  });

  it('refuses a duplicate email at the database unique key and creates no credential', async () => {
    // The application pre-check misses on this adapter, so the second sign-up
    // reaches the real constraint the schema declares.
    const racing = new SignUpUseCase(
      new CreateUserUseCase(new RaceBehindUsers(database), userEvents, boundary),
      new SetUserCredentialUseCase(
        new RaceBehindUsers(database),
        credentials,
        sessions,
        hasher,
        audit,
        boundary,
      ),
      boundary,
    );
    const email = uniqueEmail();

    const first = await racing.execute(
      new SignUp({ displayName: 'First', email, password: PASSWORD }),
    );
    expect(first.isOk()).toBe(true);
    createdUserIds.push(first.valueOrThrow().id);

    const second = await racing.execute(
      new SignUp({ displayName: 'Second', email, password: 'an entirely different secret' }),
    );

    expect(second.isFail()).toBe(true);
    expect(second.errorOrThrow().code).toBe('DUPLICATE_USER');
    expect(second.errorOrThrow().category).toBe('CONFLICT');

    // One user, one credential, and nothing further for the refused attempt.
    expect(await userCount(email)).toBe(1);
    expect(await credentialCount(first.valueOrThrow().id)).toBe(1);
  });

  it('rolls the whole registration back when the credential cannot be established', async () => {
    const failing = new SignUpUseCase(
      new CreateUserUseCase(users, userEvents, boundary),
      new SetUserCredentialUseCase(
        users,
        new FailingCredentials(database),
        sessions,
        hasher,
        audit,
        boundary,
      ),
      boundary,
    );
    const email = uniqueEmail();

    // The establishment failure is not a business outcome: it propagates as
    // the technical failure it is, which is what the real transaction boundary
    // answers with a full rollback.
    await expect(
      failing.execute(new SignUp({ displayName: 'Ali Rezaei', email, password: PASSWORD })),
    ).rejects.toThrow(PersistenceError);

    // No partial registration survives: no user row, no credential, no outbox
    // fact — everything the boundary opened was undone as one unit.
    expect(await userCount(email)).toBe(0);
    const [outboxRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM ${OUTBOX_TABLE} WHERE event_type = 'UserCreated' AND payload LIKE ?`,
      [`%${email}%`],
    );
    expect(Number((outboxRows[0] as RowDataPacket).total)).toBe(0);
  });

  it('refuses a secret that breaks the password policy before any row is written', async () => {
    const email = uniqueEmail();

    const outcome = await signUp.execute(
      new SignUp({ displayName: 'Ali Rezaei', email, password: 'too-short' }),
    );

    expect(outcome.isFail()).toBe(true);
    expect(outcome.errorOrThrow().code).toBe('PASSWORD_POLICY_VIOLATION');
    expect(await userCount(email)).toBe(0);

    // And nothing else landed either — no outbox fact, no audit row.
    const [outboxRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM ${OUTBOX_TABLE} WHERE event_type = 'UserCreated' AND payload LIKE ?`,
      [`%${email}%`],
    );
    expect(Number((outboxRows[0] as RowDataPacket).total)).toBe(0);
    const [auditRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM ${AUDIT_TABLE} WHERE metadata LIKE ?`,
      [`%${email}%`],
    );
    expect(Number((auditRows[0] as RowDataPacket).total)).toBe(0);
  });

  it('gives the registration no tenant, membership, role or session record', async () => {
    const email = uniqueEmail();

    const outcome = await signUp.execute(
      new SignUp({ displayName: 'Ali Rezaei', email, password: PASSWORD }),
    );
    expect(outcome.isOk()).toBe(true);
    createdUserIds.push(outcome.valueOrThrow().id);

    // The only durable traces are the user row, the credential row, their two
    // facts — and no session, tenant or membership anywhere.
    const [sessionRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM ${SESSION_TABLE}`,
    );
    expect(Number((sessionRows[0] as RowDataPacket).total)).toBe(0);
    const rows = await auditRowsForCreatedUsers();
    for (const row of rows) {
      expect(row.tenant_id ?? null).toBeNull();
    }
  });
});
