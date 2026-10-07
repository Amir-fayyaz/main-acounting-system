import { createHash } from 'node:crypto';
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
import { GetAuthenticatedSession } from '../src/modules/identity/application/queries/get-authenticated-session.query.js';
import { SetUserCredential } from '../src/modules/identity/application/commands/set-user-credential.command.js';
import { SignIn } from '../src/modules/identity/application/commands/sign-in.command.js';
import { SignOut } from '../src/modules/identity/application/commands/sign-out.command.js';
import { GetAuthenticatedSessionUseCase } from '../src/modules/identity/application/use-cases/get-authenticated-session.use-case.js';
import { SetUserCredentialUseCase } from '../src/modules/identity/application/use-cases/set-user-credential.use-case.js';
import { SignInUseCase } from '../src/modules/identity/application/use-cases/sign-in.use-case.js';
import { SignOutUseCase } from '../src/modules/identity/application/use-cases/sign-out.use-case.js';
import { AuthSession } from '../src/modules/identity/domain/aggregates/auth-session.js';
import { User } from '../src/modules/identity/domain/aggregates/user.js';
import { PlainPassword } from '../src/modules/identity/domain/value-objects/plain-password.js';
import { OutboxAuthenticationAuditRecorder } from '../src/modules/identity/infrastructure/audit/outbox-authentication-audit-recorder.js';
import { DrizzleAuthSessionRepository } from '../src/modules/identity/infrastructure/persistence/drizzle-auth-session.repository.js';
import { ensureAuthSessionSchema } from '../src/modules/identity/infrastructure/persistence/drizzle-auth-session.schema.js';
import { DrizzleCredentialRepository } from '../src/modules/identity/infrastructure/persistence/drizzle-credential.repository.js';
import { ensureCredentialSchema } from '../src/modules/identity/infrastructure/persistence/drizzle-credential.schema.js';
import { DrizzleUserRepository } from '../src/modules/identity/infrastructure/persistence/drizzle-user.repository.js';
import { ensureUserSchema } from '../src/modules/identity/infrastructure/persistence/drizzle-user.schema.js';
import { CryptoSessionTokenService } from '../src/modules/identity/infrastructure/security/crypto-session-token-service.js';
import { ScryptPasswordHasher } from '../src/modules/identity/infrastructure/security/scrypt-password-hasher.js';
import { ConflictError } from '../src/shared/errors/category-errors.js';
import { toConflict } from '../src/shared/persistence/optimistic-concurrency.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../src/shared/persistence/persistence-error.js';
import { Revision } from '../src/shared/persistence/revision.js';
import { DateTime } from '../src/shared/time/date-time.js';
import type { TransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';
import { createTransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';

/**
 * Authentication persistence against a real MySQL server (IAM-005).
 *
 * The unit and HTTP specs prove the use cases and the API over in-memory doubles;
 * these prove what only a real server can: the credential and the session
 * round-trip through Drizzle, the stored credential is a salted hash of the shape
 * the domain validates, the session row holds a token *digest* that matches an
 * independently computed SHA-256, the unique key refuses two sessions answering
 * to one credential, a rotation's compare-and-swap refuses the loser, a bulk
 * invalidation leaves every row invalidated, and the audit records land in the
 * shared outbox — including for a failed attempt that wrote no state at all.
 *
 * Opt-in, so the required quality gate still runs without infrastructure:
 *
 * ```bash
 * pnpm infra:up
 * MYSQL_INTEGRATION=1 pnpm --filter @accounting-saas/backend test
 * ```
 *
 * Only this feature's tables are created and dropped. Rows this spec inserts into
 * the shared `users` and `outbox_events` tables are removed by identity, so a
 * concurrent integration spec that owns those tables is not disturbed.
 */
const integrationEnabled = env.MYSQL_INTEGRATION === '1';

const USERS_TABLE = 'users';
const CREDENTIAL_TABLE = 'user_credentials';
const SESSION_TABLE = 'auth_sessions';
const OUTBOX_TABLE = 'outbox_events';

const PASSWORD = 'correct horse battery staple';

/** The audit events this spec owns, so shared-table assertions stay scoped. */
const AUDIT_EVENT_TYPES = [
  'UserCredentialEstablished',
  'UserAuthenticated',
  'SignInFailed',
  'AuthenticationEnded',
  'AuthenticationStateRejected',
] as const;

describe.skipIf(!integrationEnabled)('authentication persistence (integration)', () => {
  let pool: Pool;
  let database: Database;
  let boundary: TransactionBoundary;
  let users: DrizzleUserRepository;
  let credentials: DrizzleCredentialRepository;
  let sessions: DrizzleAuthSessionRepository;
  let hasher: ScryptPasswordHasher;
  let tokens: CryptoSessionTokenService;
  let signIn: SignInUseCase;
  let signOut: SignOutUseCase;
  let setCredential: SetUserCredentialUseCase;
  let getAuthenticatedSession: GetAuthenticatedSessionUseCase;

  /** The audit rows this spec produced, in order. */
  async function auditRows(): Promise<RowDataPacket[]> {
    const placeholders = AUDIT_EVENT_TYPES.map(() => '?').join(', ');
    const [rows] = await pool.query(
      `SELECT event_type, payload FROM ${OUTBOX_TABLE} WHERE event_type IN (${placeholders}) ` +
        'ORDER BY created_at, id',
      [...AUDIT_EVENT_TYPES],
    );
    return rows as RowDataPacket[];
  }

  async function deleteOwnAuditRows(): Promise<void> {
    const placeholders = AUDIT_EVENT_TYPES.map(() => '?').join(', ');
    await pool.query(`DELETE FROM ${OUTBOX_TABLE} WHERE event_type IN (${placeholders})`, [
      ...AUDIT_EVENT_TYPES,
    ]);
  }

  /** A unique email per run, so rows this spec owns are always identifiable. */
  function uniqueEmail(): string {
    return `iam005.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
  }

  async function createUser(): Promise<User> {
    const user = User.create({ displayName: 'Ali Rezaei', email: uniqueEmail(), now: DateTime.now() });
    await users.add(user);
    return user;
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
    await ensureOutboxSchema(database);

    boundary = createTransactionBoundary(new DrizzleTransactionRunner(database));
    users = new DrizzleUserRepository(database);
    credentials = new DrizzleCredentialRepository(database);
    sessions = new DrizzleAuthSessionRepository(database);
    hasher = new ScryptPasswordHasher();
    tokens = new CryptoSessionTokenService();
    const audit = new OutboxAuthenticationAuditRecorder(
      new OutboxRecorder(new DrizzleOutboxStore(database)),
      boundary,
    );

    const sessionTtlMinutes = 60;
    signIn = new SignInUseCase(
      users,
      credentials,
      sessions,
      hasher,
      tokens,
      audit,
      boundary,
      sessionTtlMinutes,
    );
    signOut = new SignOutUseCase(sessions, audit, boundary);
    setCredential = new SetUserCredentialUseCase(
      users,
      credentials,
      sessions,
      hasher,
      audit,
      boundary,
    );
    getAuthenticatedSession = new GetAuthenticatedSessionUseCase(users, sessions, tokens, audit);
  });

  beforeEach(async () => {
    await pool.query(`DELETE FROM ${SESSION_TABLE}`);
    await pool.query(`DELETE FROM ${CREDENTIAL_TABLE}`);
    await pool.query(`DELETE FROM ${USERS_TABLE} WHERE email LIKE 'iam005.%@example.com'`);
    await deleteOwnAuditRows();
  });

  afterAll(async () => {
    if (pool !== undefined) {
      await pool.query(`DELETE FROM ${USERS_TABLE} WHERE email LIKE 'iam005.%@example.com'`);
      await deleteOwnAuditRows();
      for (const table of [SESSION_TABLE, CREDENTIAL_TABLE]) {
        await pool.query(`DROP TABLE IF EXISTS ${table}`);
      }
      await pool.end();
    }
  });

  it('stores a salted hash, never the secret, and authenticates against it', async () => {
    const user = await createUser();

    const established = await setCredential.execute(
      new SetUserCredential({ userId: user.id.value, password: PASSWORD }),
    );
    expect(established.isOk()).toBe(true);

    const [hashRows] = await pool.query<RowDataPacket[]>(
      `SELECT password_hash FROM ${CREDENTIAL_TABLE} WHERE user_id = ?`,
      [user.id.value],
    );
    const storedHash = String((hashRows[0] as RowDataPacket).password_hash);
    expect(storedHash.startsWith('scrypt(n=131072,r=8,p=1)$')).toBe(true);
    expect(storedHash).not.toContain(PASSWORD);

    const signedIn = await signIn.execute(
      new SignIn({ email: user.email.value, password: PASSWORD }),
    );
    expect(signedIn.isOk()).toBe(true);
    const token = signedIn.valueOrThrow().token;

    const [sessionRows] = await pool.query<RowDataPacket[]>(
      `SELECT user_id, token_hash, revoked_at FROM ${SESSION_TABLE}`,
    );
    const stored = sessionRows[0] as RowDataPacket;
    expect(stored.user_id).toBe(user.id.value);
    // The stored digest is an independently computed SHA-256 of the token, and
    // never the token itself.
    expect(stored.token_hash).toBe(createHash('sha256').update(token, 'utf8').digest('hex'));
    expect(stored.revoked_at).toBeNull();

    // The successful authentication reached the approved audit boundary, and the
    // record carries no credential.
    const rows = await auditRows();
    expect(rows.map((row) => row.event_type)).toEqual([
      'UserCredentialEstablished',
      'UserAuthenticated',
    ]);
    const payload = JSON.stringify(rows[1]?.payload);
    expect(payload).not.toContain(token);
    expect(payload).not.toContain(PASSWORD);
    expect(payload).not.toContain(storedHash);
  });

  it('audits a failed attempt although it changed no state', async () => {
    const user = await createUser();
    await setCredential.execute(
      new SetUserCredential({ userId: user.id.value, password: PASSWORD }),
    );

    const outcome = await signIn.execute(
      new SignIn({ email: user.email.value, password: 'an incorrect secret value' }),
    );

    expect(outcome.errorOrThrow().code).toBe('INVALID_CREDENTIALS');
    const [sessionCount] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM ${SESSION_TABLE}`,
    );
    expect(Number((sessionCount[0] as RowDataPacket).total)).toBe(0);

    // The failure was recorded in its own transaction: a rejected attempt must
    // not be rolled back with a boundary it never opened.
    const failure = (await auditRows()).find((row) => row.event_type === 'SignInFailed');
    expect(failure).toBeDefined();
    expect(JSON.stringify(failure?.payload)).toContain('INVALID_SECRET');
    expect(JSON.stringify(failure?.payload)).not.toContain('an incorrect secret value');
  });

  it('refuses a second session answering to the same token digest', async () => {
    const user = await createUser();
    const tokenHash = tokens.hash('the same presented token');
    const now = DateTime.now();
    const expiresAt = DateTime.fromEpochMillis(now.epochMillis + 60_000);

    await sessions.add(AuthSession.create({ userId: user.id, tokenHash, expiresAt, now }));

    let failure: unknown;
    try {
      await sessions.add(AuthSession.create({ userId: user.id, tokenHash, expiresAt, now }));
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(PersistenceError);
    expect((failure as PersistenceError).kind).toBe(PersistenceFailureKind.CONFLICT);
  });

  it('refuses a credential rotation that lost the race and keeps the winner', async () => {
    const user = await createUser();
    await setCredential.execute(
      new SetUserCredential({ userId: user.id.value, password: PASSWORD }),
    );

    const stale = (await credentials.get(user.id))!.aggregate;
    const winnerHash = await hasher.hash(PlainPassword.from('the winning secret value'));

    // A writer that read revision 1 rotates first...
    const first = (await credentials.get(user.id))!;
    first.aggregate.replacePasswordHash(winnerHash, DateTime.now());
    await boundary.execute(() => credentials.update(first.aggregate, first.revision));

    // ...and the writer still at revision 1 is refused, reported as the shared
    // conflict rather than overwriting the winner.
    let failure: unknown;
    try {
      stale.replacePasswordHash(
        await hasher.hash(PlainPassword.from('the losing secret value')),
        DateTime.now(),
      );
      await boundary.execute(() => credentials.update(stale, Revision.initial()));
    } catch (error) {
      failure = error;
    }

    expect(toConflict(failure)).toBeInstanceOf(ConflictError);
    const stored = await credentials.get(user.id);
    expect(stored?.revision.value).toBe(2);
    expect(stored?.aggregate.passwordHash.equals(winnerHash)).toBe(true);
  });

  it('invalidates every session of a user in one statement', async () => {
    const user = await createUser();
    const now = DateTime.now();
    const expiresAt = DateTime.fromEpochMillis(now.epochMillis + 60_000);

    for (let index = 0; index < 3; index += 1) {
      await sessions.add(
        AuthSession.create({
          userId: user.id,
          tokenHash: tokens.hash(`token-${index}`),
          expiresAt,
          now,
        }),
      );
    }

    const affected = await boundary.execute(() => sessions.revokeActiveForUser(user.id, now));

    expect(affected).toBe(3);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT revoked_at, revision FROM ${SESSION_TABLE}`,
    );
    expect(rows).toHaveLength(3);
    for (const row of rows as RowDataPacket[]) {
      expect(row.revoked_at).not.toBeNull();
      expect(Number(row.revision)).toBe(2);
    }

    const rejected = await getAuthenticatedSession.execute(
      new GetAuthenticatedSession({ token: 'token-0' }),
    );
    expect(rejected.errorOrThrow().code).toBe('SESSION_REVOKED');
  });

  it('rejects an expired session and keeps its record', async () => {
    const user = await createUser();
    const now = DateTime.now();
    const created = AuthSession.create({
      userId: user.id,
      tokenHash: tokens.hash('an expired token'),
      expiresAt: DateTime.fromEpochMillis(now.epochMillis + 1_000),
      now,
    });
    await sessions.add(
      AuthSession.rehydrate({
        ...created.snapshot(),
        expiresAt: DateTime.fromEpochMillis(now.epochMillis - 1_000),
      }),
    );

    const outcome = await getAuthenticatedSession.execute(
      new GetAuthenticatedSession({ token: 'an expired token' }),
    );

    expect(outcome.errorOrThrow().code).toBe('SESSION_EXPIRED');
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT id FROM ${SESSION_TABLE}`);
    expect(rows).toHaveLength(1);
    expect((await auditRows()).map((row) => row.event_type)).toContain(
      'AuthenticationStateRejected',
    );
  });

  it('invalidates a session durably, so a sign-out survives a fresh read', async () => {
    const user = await createUser();
    await setCredential.execute(
      new SetUserCredential({ userId: user.id.value, password: PASSWORD }),
    );
    const token = (
      await signIn.execute(new SignIn({ email: user.email.value, password: PASSWORD }))
    ).valueOrThrow().token;
    const session = await sessions.findByTokenHash(tokens.hash(token));
    expect(session).toBeDefined();

    const ended = await signOut.execute(
      new SignOut({ sessionId: session!.aggregate.sessionId() }),
    );
    expect(ended.isOk()).toBe(true);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT revoked_at FROM ${SESSION_TABLE} WHERE token_hash = ?`,
      [tokens.hash(token).value],
    );
    expect((rows[0] as RowDataPacket).revoked_at).not.toBeNull();

    const rejected = await getAuthenticatedSession.execute(
      new GetAuthenticatedSession({ token }),
    );
    expect(rejected.errorOrThrow().code).toBe('SESSION_REVOKED');
    expect((await auditRows()).map((row) => row.event_type)).toEqual([
      'UserCredentialEstablished',
      'UserAuthenticated',
      'AuthenticationEnded',
    ]);
  });
});
