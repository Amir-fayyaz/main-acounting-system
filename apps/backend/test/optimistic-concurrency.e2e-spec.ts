import { env } from 'node:process';

import { and, eq } from 'drizzle-orm';
import { int, mysqlTable, varchar } from 'drizzle-orm/mysql-core';
import { drizzle } from 'drizzle-orm/mysql2';
import { createPool, type Pool, type PoolConnection, type RowDataPacket } from 'mysql2/promise';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ConflictError, ValidationError } from '../src/shared/errors/category-errors.js';
import { ErrorCategory } from '../src/shared/errors/error-category.js';
import { Result } from '../src/shared/errors/result.js';
import { EntityId } from '../src/shared/id/entity-id.js';
import {
  isConcurrencyConflict,
  staleRevisionConflict,
  staleRevisionOf,
  toConflict,
} from '../src/shared/persistence/optimistic-concurrency.js';
import type { Loaded, WriteReceipt } from '../src/shared/persistence/repository-ports.js';
import { Revision } from '../src/shared/persistence/revision.js';
import { STALE_REVISION_DETAIL_CODE } from '../src/shared/persistence/stale-revision.js';
import type { TransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';
import { createTransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';
import { AppConfigService } from '../src/infrastructure/config/app-config.service.js';
import { loadConfiguration } from '../src/infrastructure/config/configuration.js';
import { loadDotEnvFiles } from '../src/infrastructure/config/dotenv.js';
import type { Database } from '../src/infrastructure/database/database.module.js';
import { DrizzleTransactionRunner } from '../src/infrastructure/database/drizzle-transaction-runner.js';
import { scopedDatabase } from '../src/infrastructure/database/scoped-database.js';

/**
 * Optimistic concurrency against a real MySQL server (SHR-008).
 *
 * The contract tests in `src/shared/persistence/` prove the mechanism against
 * an in-memory store; these prove the same contract on a real connection and a
 * real `UPDATE ... WHERE revision = ?`: two transactions that read the same
 * revision cannot both commit, the loser's whole transaction rolls back, the
 * revision advances exactly once, the failure arrives as a distinguishable
 * conflict, and nothing in the stack replays the mutation. They are opt-in, so
 * the required quality gate still runs without infrastructure:
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

const PROBE_TABLE = 'shr008_optimistic_concurrency_probe';

const probe = mysqlTable(PROBE_TABLE, {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 191 }).notNull(),
  revision: int('revision').notNull(),
});

/** The protected state: enough shape to be changed, no business rules. */
interface ProtectedRecord {
  readonly id: EntityId;
  readonly name: string;
}

/**
 * The repository shape a module's adapter will have: the shared ports'
 * semantics, one compare-and-swap per write, and the shared stale-revision
 * failure — writing through `scopedDatabase` so every statement joins whatever
 * transaction the use case opened.
 */
class ProbeRecords {
  /** Every attempt to mutate the record, so a hidden retry cannot hide. */
  public updateAttempts = 0;

  public constructor(private readonly database: Database) {}

  public async get(id: EntityId): Promise<Loaded<ProtectedRecord> | undefined> {
    const rows = await scopedDatabase(this.database)
      .select()
      .from(probe)
      .where(eq(probe.id, id.value));
    const row = rows[0];
    return row === undefined
      ? undefined
      : { aggregate: { id, name: row.name }, revision: Revision.of(row.revision) };
  }

  public async add(aggregate: ProtectedRecord): Promise<WriteReceipt> {
    await scopedDatabase(this.database)
      .insert(probe)
      .values({ id: aggregate.id.value, name: aggregate.name, revision: 1 });
    return { revision: Revision.initial() };
  }

  public async update(
    aggregate: ProtectedRecord,
    expectedRevision: Revision,
  ): Promise<WriteReceipt> {
    this.updateAttempts += 1;

    // One statement: the check and the mutation are the same step, so no other
    // transaction can land between them.
    const [header] = await scopedDatabase(this.database)
      .update(probe)
      .set({ name: aggregate.name, revision: expectedRevision.value + 1 })
      .where(and(eq(probe.id, aggregate.id.value), eq(probe.revision, expectedRevision.value)));

    if (header.affectedRows === 0) {
      // The store answers "nothing matched" without naming what is stored
      // instead, so the cause stays honest about the unknown current revision.
      throw staleRevisionConflict('ProbeRecords.update', expectedRevision);
    }
    return { revision: expectedRevision.next() };
  }
}

/** A latch every participant reaches before any of them is allowed to write. */
function barrier(participants: number): { wait: () => Promise<void> } {
  let remaining = participants;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    wait: () => {
      remaining -= 1;
      if (remaining === 0) {
        release();
      }
      return gate;
    },
  };
}

const recordId = EntityId.from('018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70');
const auditId = EntityId.from('018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f71');
const record = (name: string): ProtectedRecord => ({ id: recordId, name });

describe.skipIf(!integrationEnabled)('optimistic concurrency (integration)', () => {
  let pool: Pool;
  let database: Database;
  let boundary: TransactionBoundary;
  let repository: ProbeRecords;
  /** A second connection: what any other reader of the database would see. */
  let observer: PoolConnection;

  async function committedRows(): Promise<readonly RowDataPacket[]> {
    const [rows] = await observer.query(`SELECT id, name, revision FROM ${PROBE_TABLE}`);
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

    await pool.query(
      `CREATE TABLE IF NOT EXISTS ${PROBE_TABLE} (` +
        'id VARCHAR(64) NOT NULL, ' +
        'name VARCHAR(191) NOT NULL, ' +
        'revision INT NOT NULL, ' +
        'PRIMARY KEY (id))',
    );

    database = drizzle(pool);
    boundary = createTransactionBoundary(new DrizzleTransactionRunner(database));
    repository = new ProbeRecords(database);
    observer = await pool.getConnection();
  });

  beforeEach(async () => {
    await pool.query(`DELETE FROM ${PROBE_TABLE}`);
    repository.updateAttempts = 0;
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

  it('commits a successful update and advances the revision by exactly one', async () => {
    await repository.add(record('original'));

    const receipt = await boundary.execute(() =>
      repository.update(record('renamed'), Revision.initial()),
    );

    expect(receipt.revision.value).toBe(2);
    expect(await committedRows()).toEqual([{ id: recordId.value, name: 'renamed', revision: 2 }]);
    expect(repository.updateAttempts).toBe(1);
  });

  it('refuses the second of two operations that read the same revision, and keeps the first', async () => {
    await repository.add(record('original'));
    const first = await repository.get(recordId);
    const second = await repository.get(recordId);
    expect(first?.revision.value).toBe(second?.revision.value);

    const winner = await boundary.execute(() =>
      repository.update(record('first writer'), first!.revision),
    );
    expect(winner.revision.value).toBe(2);

    let failure: unknown;
    const outcome = await boundary.execute(async () => {
      // Work staged before the conflict: it shares the transaction's fate.
      await repository.add({ id: auditId, name: 'audit entry' });
      try {
        await repository.update(record('second writer'), second!.revision);
        return Result.ok('applied');
      } catch (error) {
        failure = error;
        const conflict = toConflict(error);
        if (conflict !== undefined) {
          return Result.fail(conflict);
        }
        throw error;
      }
    });

    expect(outcome.isFail()).toBe(true);
    expect(outcome.error()).toBeInstanceOf(ConflictError);

    // The conflict is distinguishable all the way out, with the revision the
    // loser worked against — and the store could not say what is there now.
    expect(isConcurrencyConflict(failure)).toBe(true);
    expect(staleRevisionOf(failure)).toEqual({ expected: 1, actual: undefined });
    expect(toConflict(failure)?.category).toBe(ErrorCategory.CONFLICT);
    expect(toConflict(failure)?.details).toEqual([
      {
        code: STALE_REVISION_DETAIL_CODE,
        message:
          'The record was written by someone else; this update was prepared against revision 1.',
        field: 'revision',
        expected: 1,
      },
    ]);

    // The winner's write stands at revision 2; the loser's staged work is gone
    // with its rolled-back transaction, and the revision moved once.
    expect(await committedRows()).toEqual([
      { id: recordId.value, name: 'first writer', revision: 2 },
    ]);
    expect(repository.updateAttempts).toBe(2);
  });

  it('lets exactly one of two transactions racing on the same row commit', async () => {
    await repository.add(record('original'));
    const start = barrier(2);

    const race = ['racer-1', 'racer-2'].map((name) =>
      boundary.execute(async () => {
        const loaded = await repository.get(recordId);
        await start.wait();
        try {
          const receipt = await repository.update(record(name), loaded!.revision);
          return Result.ok({ name, revision: receipt.revision.value });
        } catch (error) {
          const conflict = toConflict(error);
          if (conflict !== undefined) {
            return Result.fail(conflict);
          }
          throw error;
        }
      }),
    );

    const [first, second] = await Promise.all(race);
    const winners = [first, second].filter((outcome) => outcome.isOk());
    const losers = [first, second].filter((outcome) => outcome.isFail());

    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    expect(winners[0]?.valueOrThrow().revision).toBe(2);
    expect(losers[0]?.errorOrThrow()).toBeInstanceOf(ConflictError);

    // The stored row is the winner's, the revision advanced exactly once, and
    // each operation attempted its mutation exactly once: no hidden retry.
    const rows = await committedRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe(winners[0]?.valueOrThrow().name);
    expect(rows[0]?.revision).toBe(2);
    expect(repository.updateAttempts).toBe(2);
  });

  it('keeps a validation failure off the conflict path', async () => {
    const validation = new ValidationError('The name must not be blank.');

    expect(isConcurrencyConflict(validation)).toBe(false);
    expect(toConflict(validation)).toBeUndefined();
    expect(validation.category).toBe(ErrorCategory.VALIDATION);
    expect(staleRevisionConflict('ProbeRecords.update', Revision.initial()).retryable).toBe(false);
  });
});
