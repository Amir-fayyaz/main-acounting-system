import { env } from 'node:process';

import { and, eq } from 'drizzle-orm';
import { int, mysqlTable, varchar } from 'drizzle-orm/mysql-core';
import { drizzle } from 'drizzle-orm/mysql2';
import { createPool, type Pool, type PoolConnection, type RowDataPacket } from 'mysql2/promise';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ConflictError } from '../src/shared/errors/category-errors.js';
import { Result } from '../src/shared/errors/result.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../src/shared/persistence/persistence-error.js';
import type { TransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';
import {
  createTransactionBoundary,
  TransactionBoundaryError,
} from '../src/shared/transaction/transaction-boundary.js';
import { AppConfigService } from '../src/infrastructure/config/app-config.service.js';
import { loadConfiguration } from '../src/infrastructure/config/configuration.js';
import { loadDotEnvFiles } from '../src/infrastructure/config/dotenv.js';
import type { Database } from '../src/infrastructure/database/database.module.js';
import { DrizzleTransactionRunner } from '../src/infrastructure/database/drizzle-transaction-runner.js';
import { scopedDatabase } from '../src/infrastructure/database/scoped-database.js';

/**
 * Transaction boundary against a real MySQL server (SHR-005).
 *
 * The contract tests in `src/shared/transaction/` prove the semantics against
 * an in-memory runner; these prove that the Drizzle adapter honours the same
 * contract on a real connection — commit, rollback, participation of
 * repository writes, nesting, a conflicting concurrent update and the line
 * between a database effect and an external one. They are opt-in, so the
 * required quality gate still runs without infrastructure:
 *
 * ```bash
 * pnpm infra:up
 * MYSQL_INTEGRATION=1 pnpm --filter @accounting-saas/backend test
 * ```
 *
 * `env` is imported from `node:process` (rather than read through
 * `process.env`) because the configuration boundary rule reserves
 * `process.env` for the configuration layer; this is a test gate, not
 * application configuration. The probe table is created, used and dropped by
 * this file: no module owns it, and no migration is implied.
 */
const integrationEnabled = env.MYSQL_INTEGRATION === '1';

const PROBE_TABLE = 'shr005_transaction_probe';

const probe = mysqlTable(PROBE_TABLE, {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 191 }).notNull(),
  revision: int('revision').notNull(),
});

/**
 * The repository shape a module's adapter will have: the shared ports'
 * semantics, writing through `scopedDatabase` so every write joins whatever
 * transaction the use case opened — and stands alone when none is open.
 */
class ProbeRepository {
  public constructor(private readonly database: Database) {}

  public async get(id: string): Promise<{ name: string; revision: number } | undefined> {
    const rows = await scopedDatabase(this.database).select().from(probe).where(eq(probe.id, id));
    const row = rows[0];
    return row === undefined ? undefined : { name: row.name, revision: row.revision };
  }

  public async add(id: string, name: string): Promise<void> {
    await scopedDatabase(this.database).insert(probe).values({ id, name, revision: 1 });
  }

  public async update(id: string, name: string, expectedRevision: number): Promise<void> {
    const [header] = await scopedDatabase(this.database)
      .update(probe)
      .set({ name, revision: expectedRevision + 1 })
      .where(and(eq(probe.id, id), eq(probe.revision, expectedRevision)));

    if (header.affectedRows === 0) {
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'ProbeRepository.update');
    }
  }
}

function deferred(): { promise: Promise<void>; release: () => void } {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

describe.skipIf(!integrationEnabled)('transaction boundary (integration)', () => {
  let pool: Pool;
  let database: Database;
  let boundary: TransactionBoundary;
  let repository: ProbeRepository;
  /** A second connection: what any other reader of the database would see. */
  let observer: PoolConnection;

  /** The ids committed as far as the rest of the database is concerned. */
  async function committedIds(): Promise<string[]> {
    const [rows] = await observer.query(`SELECT id FROM ${PROBE_TABLE} ORDER BY id`);
    return (rows as RowDataPacket[]).map((row) => String(row.id));
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

    await pool.query(
      `CREATE TABLE IF NOT EXISTS ${PROBE_TABLE} (` +
        'id VARCHAR(64) NOT NULL, ' +
        'name VARCHAR(191) NOT NULL, ' +
        'revision INT NOT NULL, ' +
        'PRIMARY KEY (id))',
    );

    database = drizzle(pool);
    boundary = createTransactionBoundary(new DrizzleTransactionRunner(database));
    repository = new ProbeRepository(database);
    observer = await pool.getConnection();
  });

  beforeEach(async () => {
    await pool.query(`DELETE FROM ${PROBE_TABLE}`);
  });

  afterAll(async () => {
    if (observer !== undefined) {
      observer.release();
    }
    if (pool !== undefined) {
      await pool.query(`DROP TABLE IF EXISTS ${PROBE_TABLE}`);
      await pool.end();
    }
  });

  it('commits every write of one use case as a single unit', async () => {
    await boundary.execute(async () => {
      await repository.add('invoice', 'INV-1');
      await repository.add('ledger', 'POST-1');
    });

    expect(await committedIds()).toEqual(['invoice', 'ledger']);
    expect(await repository.get('invoice')).toEqual({ name: 'INV-1', revision: 1 });
  });

  it('rolls back every write of the boundary when a later operation fails', async () => {
    await expect(
      boundary.execute(async () => {
        await repository.add('invoice', 'INV-1');
        await repository.add('ledger', 'POST-1');
        throw new Error('the database went away after two writes');
      }),
    ).rejects.toThrow('the database went away');

    expect(await committedIds()).toEqual([]);
  });

  it('keeps repository writes invisible to other connections until the outer boundary commits', async () => {
    await boundary.execute(async () => {
      await repository.add('outer', 'from the outer use case');

      await boundary.execute(async () => {
        await repository.add('inner', 'from the nested use case');
      });

      // The nested use case returned, but neither write is committed: the
      // outer boundary owns both, and no inner operation committed on its own.
      expect(await committedIds()).toEqual([]);
    });

    expect(await committedIds()).toEqual(['inner', 'outer']);
  });

  it('refuses to commit when a failure inside the boundary was swallowed by the caller', async () => {
    const failure = new Error('inner operation failed');
    let caught: unknown;

    try {
      await boundary.execute(async () => {
        await repository.add('outer', 'assembled first');
        try {
          await boundary.execute(async () => {
            await repository.add('inner', 'partial work');
            throw failure;
          });
        } catch {
          // The caller decided to carry on; the boundary did not.
        }
        return Result.ok('appears successful');
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(TransactionBoundaryError);
    expect((caught as TransactionBoundaryError).cause).toBe(failure);
    expect(await committedIds()).toEqual([]);
  });

  it('turns a conflicting concurrent update into a conflict instead of an overwrite', async () => {
    await repository.add('invoice', 'first');

    const gate = deferred();

    const attempt = boundary.execute(async () => {
      await repository.add('attempt', 'must not survive');

      const loaded = await repository.get('invoice');
      if (loaded === undefined) {
        throw new Error('the invoice disappeared');
      }

      await gate.promise;

      try {
        await repository.update('invoice', 'mine', loaded.revision);
      } catch (error) {
        if (error instanceof PersistenceError) {
          const domainError = error.toDomainError();
          if (domainError !== undefined) {
            return Result.fail(domainError);
          }
        }
        throw error;
      }
      return Result.ok('overwritten');
    });

    // The rival is another use case with its own transaction, committing from
    // another connection while the attempt is still in flight.
    await boundary.execute(async () => {
      await repository.update('invoice', 'rival', 1);
    });
    gate.release();

    const outcome = await attempt;

    expect(outcome.isFail()).toBe(true);
    expect(outcome.error()).toBeInstanceOf(ConflictError);
    expect(await repository.get('invoice')).toEqual({ name: 'rival', revision: 2 });
    expect(await committedIds()).toEqual(['invoice']);
  });

  it('rolls back database work only: an external effect inside the boundary is not undone', async () => {
    const providerCalls: string[] = [];

    await expect(
      boundary.execute(async () => {
        await repository.add('payment', 'PAY-1');
        // A provider API call: answered outside the database, so no rollback
        // of the transaction can reach it (ADR-004, sections 9 and 12-13).
        providerCalls.push('PAY-1');
        throw new Error('the database went away after the provider answered');
      }),
    ).rejects.toThrow('the database went away');

    expect(await committedIds()).toEqual([]);
    expect(providerCalls).toEqual(['PAY-1']);
  });
});
