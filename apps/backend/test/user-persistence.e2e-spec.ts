import { env } from 'node:process';

import { drizzle } from 'drizzle-orm/mysql2';
import { createPool, type Pool } from 'mysql2/promise';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppConfigService } from '../src/infrastructure/config/app-config.service.js';
import { loadConfiguration } from '../src/infrastructure/config/configuration.js';
import { loadDotEnvFiles } from '../src/infrastructure/config/dotenv.js';
import type { Database } from '../src/infrastructure/database/database.module.js';
import { DrizzleTransactionRunner } from '../src/infrastructure/database/drizzle-transaction-runner.js';
import { ChangeUserStatus } from '../src/modules/identity/application/commands/change-user-status.command.js';
import { CreateUser } from '../src/modules/identity/application/commands/create-user.command.js';
import { UpdateUser } from '../src/modules/identity/application/commands/update-user.command.js';
import { GetUser } from '../src/modules/identity/application/queries/get-user.query.js';
import { ChangeUserStatusUseCase } from '../src/modules/identity/application/use-cases/change-user-status.use-case.js';
import { CreateUserUseCase } from '../src/modules/identity/application/use-cases/create-user.use-case.js';
import { GetUserUseCase } from '../src/modules/identity/application/use-cases/get-user.use-case.js';
import { UpdateUserUseCase } from '../src/modules/identity/application/use-cases/update-user.use-case.js';
import { User } from '../src/modules/identity/domain/aggregates/user.js';
import { userIdFrom } from '../src/modules/identity/domain/value-objects/user-id.js';
import { DrizzleUserRepository } from '../src/modules/identity/infrastructure/persistence/drizzle-user.repository.js';
import { ensureUserSchema } from '../src/modules/identity/infrastructure/persistence/drizzle-user.schema.js';
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
import { RecordingUserEvents } from './support/user-doubles.js';

/**
 * User persistence against a real MySQL server (IAM-002).
 *
 * The unit tests prove the use cases over an in-memory repository; these prove
 * the parts only a real server can: the module's own table is created from its
 * DDL, a user round-trips through Drizzle, an update advances the revision
 * exactly once, two writers that read the same revision cannot both commit —
 * the loser's write is refused and reported as the shared conflict — and the
 * email uniqueness invariant is enforced in storage as well as in the module.
 *
 * Opt-in, so the required quality gate still runs without infrastructure:
 *
 * ```bash
 * pnpm infra:up
 * MYSQL_INTEGRATION=1 pnpm --filter @accounting-saas/backend test
 * ```
 *
 * The schema is applied by `ensureUserSchema` (the module's idempotent,
 * versioned DDL) and dropped afterwards, so the run leaves no migration
 * implied.
 */
const integrationEnabled = env.MYSQL_INTEGRATION === '1';

const USER_TABLE = 'users';

describe.skipIf(!integrationEnabled)('user persistence (integration)', () => {
  let pool: Pool;
  let database: Database;
  let boundary: TransactionBoundary;
  let repository: DrizzleUserRepository;

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

    repository = new DrizzleUserRepository(database);
    boundary = createTransactionBoundary(new DrizzleTransactionRunner(database));
  });

  beforeEach(async () => {
    await pool.query(`DELETE FROM ${USER_TABLE}`);
  });

  afterAll(async () => {
    if (pool !== undefined) {
      await pool.query(`DROP TABLE IF EXISTS ${USER_TABLE}`);
      await pool.end();
    }
  });

  it('round-trips a user and keeps its stable identifier', async () => {
    const events = new RecordingUserEvents();
    const create = new CreateUserUseCase(repository, events, boundary);

    const created = await create.execute(
      new CreateUser({ displayName: 'Ali Rezaei', email: 'Ali@Example.com' }),
    );
    expect(created.isOk()).toBe(true);
    const view = created.valueOrThrow();

    const fetched = await new GetUserUseCase(repository).execute(new GetUser({ userId: view.id }));

    expect(fetched.valueOrThrow()).toMatchObject({
      id: view.id,
      displayName: 'Ali Rezaei',
      email: 'ali@example.com',
      status: 'active',
      revision: 1,
    });
  });

  it('advances the revision by exactly one on an accepted update', async () => {
    const events = new RecordingUserEvents();
    const create = new CreateUserUseCase(repository, events, boundary);
    const update = new UpdateUserUseCase(repository, events, boundary);

    const created = (
      await create.execute(new CreateUser({ displayName: 'Before', email: 'before@example.com' }))
    ).valueOrThrow();

    const updated = await update.execute(
      new UpdateUser({ userId: created.id, displayName: 'After', expectedRevision: 1 }),
    );

    expect(updated.valueOrThrow()).toMatchObject({ displayName: 'After', revision: 2 });
    const stored = await repository.get(userIdFrom(created.id));
    expect(stored?.revision.value).toBe(2);
  });

  it('refuses the second of two writes that read the same revision, keeping the winner', async () => {
    const events = new RecordingUserEvents();
    const create = new CreateUserUseCase(repository, events, boundary);
    const changeStatus = new ChangeUserStatusUseCase(repository, events, boundary);

    const created = (
      await create.execute(
        new CreateUser({ displayName: 'Contended', email: 'contended@example.com' }),
      )
    ).valueOrThrow();
    const id = userIdFrom(created.id);

    // Both writers observe revision 1.
    const first = await repository.get(id);
    const second = await repository.get(id);
    expect(first?.revision.value).toBe(1);
    expect(second?.revision.value).toBe(1);

    const winner = await new UpdateUserUseCase(repository, events, boundary).execute(
      new UpdateUser({ userId: created.id, displayName: 'Winner', expectedRevision: 1 }),
    );
    expect(winner.valueOrThrow().revision).toBe(2);

    // Second write still believes revision 1: refused as a conflict.
    const loser = await changeStatus.execute(
      new ChangeUserStatus({ userId: created.id, status: 'inactive', expectedRevision: 1 }),
    );
    expect(loser.isFail()).toBe(true);
    expect(loser.errorOrThrow()).toBeInstanceOf(ConflictError);

    const stored = await repository.get(id);
    expect(stored?.revision.value).toBe(2);
    expect(stored?.aggregate.displayName.value).toBe('Winner');
    expect(stored?.aggregate.status.value).toBe('active');
  });

  it('reports a lost race as a distinguishable stale revision at the adapter boundary', async () => {
    const events = new RecordingUserEvents();
    const create = new CreateUserUseCase(repository, events, boundary);
    const created = (
      await create.execute(new CreateUser({ displayName: 'Racy', email: 'racy@example.com' }))
    ).valueOrThrow();
    const id = userIdFrom(created.id);

    const observed = await repository.get(id);
    expect(observed).toBeDefined();

    await boundary.execute(() => repository.update(observed!.aggregate, Revision.initial()));

    let failure: unknown;
    try {
      await boundary.execute(() => repository.update(observed!.aggregate, Revision.initial()));
    } catch (error) {
      failure = error;
    }

    const conflict = toConflict(failure);
    expect(conflict).toBeInstanceOf(ConflictError);
    expect(conflict?.details[0]).toMatchObject({ code: 'STALE_REVISION', expected: 1 });
    expect((await repository.get(id))?.revision.value).toBe(2);
  });

  it('enforces the email uniqueness invariant in storage', async () => {
    const now = DateTime.now();
    const first = User.create({ displayName: 'First', email: 'shared@example.com', now });
    await repository.add(first);

    const second = User.create({ displayName: 'Second', email: 'shared@example.com', now });
    let failure: unknown;
    try {
      await repository.add(second);
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(PersistenceError);
    expect((failure as PersistenceError).kind).toBe(PersistenceFailureKind.CONFLICT);
    await expect(repository.existsByEmail('shared@example.com')).resolves.toBe(true);
  });
});
