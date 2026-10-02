import { env } from 'node:process';

import { drizzle } from 'drizzle-orm/mysql2';
import { createPool, type Pool, type PoolConnection, type RowDataPacket } from 'mysql2/promise';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppConfigService } from '../src/infrastructure/config/app-config.service.js';
import { loadConfiguration } from '../src/infrastructure/config/configuration.js';
import { loadDotEnvFiles } from '../src/infrastructure/config/dotenv.js';
import { NO_REDACTION } from '../src/infrastructure/config/secrets.js';
import type { Database } from '../src/infrastructure/database/database.module.js';
import { DrizzleTransactionRunner } from '../src/infrastructure/database/drizzle-transaction-runner.js';
import type {
  EventPublisherPort,
  PublishedEvent,
} from '../src/infrastructure/outbox/event-publisher.port.js';
import { PermanentPublishError } from '../src/infrastructure/outbox/outbox.errors.js';
import { OutboxRecorder } from '../src/infrastructure/outbox/outbox-recorder.js';
import { OutboxPublisher } from '../src/infrastructure/outbox/outbox.publisher.js';
import type { OutboxStore } from '../src/infrastructure/outbox/outbox-store.port.js';
import { DrizzleOutboxStore } from '../src/infrastructure/outbox/persistence/drizzle-outbox-store.js';
import { ensureOutboxSchema } from '../src/infrastructure/outbox/persistence/outbox.schema.js';
import type { OutboxConfiguration } from '../src/infrastructure/config/configuration.types.js';
import { DomainEvent } from '../src/shared/messaging/domain-event.js';
import type { TransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';
import { createTransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';

/**
 * Transactional outbox against a real MySQL server (SHR-006).
 *
 * The unit specs in `src/infrastructure/outbox/` prove the state machine over
 * an in-memory store; these prove the parts only a real server can: the record
 * commits and rolls back inside the use case's transaction, stays invisible to
 * every other connection until that commit, is claimable atomically by
 * concurrent publishers, and survives a crashed run as a recoverable,
 * duplicate-tolerant record.
 *
 * Publication goes through a scripted {@link EventPublisherPort} rather than
 * Redis: what is under test here is the outbox's side of the pipeline —
 * claim, settle, retry, recover — and the transport is an injected port
 * (ADR-002, section 15).
 *
 * ```bash
 * pnpm infra:up
 * MYSQL_INTEGRATION=1 pnpm --filter @accounting-saas/backend test
 * ```
 *
 * The schema is applied by `ensureOutboxSchema` (the outbox's versioned,
 * idempotent DDL) and dropped again afterwards, so the run leaves no
 * migration implied — same contract as the SHR-005 probe.
 */
const integrationEnabled = env.MYSQL_INTEGRATION === '1';

const OUTBOX_TABLE = 'outbox_events';

/** A deliberately tiny backoff so a retry becomes due without slowing the suite. */
const OUTBOX_CONFIG: OutboxConfiguration = {
  batchSize: 10,
  maxAttempts: 3,
  retryBaseDelayMs: 1,
  retryMaxDelayMs: 2,
  publishIntervalMs: 1000,
};

class OutboxProbeRecorded extends DomainEvent<{ readonly ref: string }> {
  public constructor(ref: string) {
    super('OutboxProbeRecorded', { ref });
  }
}

/** The publication boundary, scripted: records every attempt, fails on demand. */
class ScriptedPublisher implements EventPublisherPort {
  public readonly attempts: PublishedEvent[] = [];
  public readonly failures: Error[] = [];
  public delayMs = 0;

  public async publish(event: PublishedEvent): Promise<void> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }
    this.attempts.push(event);
    const failure = this.failures.shift();
    if (failure !== undefined) {
      throw failure;
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

describe.skipIf(!integrationEnabled)('transactional outbox (integration)', () => {
  let pool: Pool;
  let database: Database;
  let store: OutboxStore;
  let recorder: OutboxRecorder;
  let boundary: TransactionBoundary;
  let publisher: ScriptedPublisher;
  let dispatcher: OutboxPublisher;
  /** A second connection: what any other reader of the database would see. */
  let observer: PoolConnection;

  async function committedRows(): Promise<RowDataPacket[]> {
    const [rows] = await observer.query(
      `SELECT id, event_id, event_type, payload, state, attempt_count, tenant_id, ` +
        `last_failure, claim_id, next_attempt_at FROM ${OUTBOX_TABLE} ORDER BY created_at, id`,
    );
    return rows as RowDataPacket[];
  }

  async function oneRow(): Promise<RowDataPacket> {
    const rows = await committedRows();
    expect(rows).toHaveLength(1);

    return rows[0] as RowDataPacket;
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
    await ensureOutboxSchema(database);

    store = new DrizzleOutboxStore(database);
    recorder = new OutboxRecorder(store);
    boundary = createTransactionBoundary(new DrizzleTransactionRunner(database));
    publisher = new ScriptedPublisher();
    dispatcher = new OutboxPublisher(store, publisher, OUTBOX_CONFIG, NO_REDACTION);
    observer = await pool.getConnection();
  });

  beforeEach(async () => {
    await pool.query(`DELETE FROM ${OUTBOX_TABLE}`);
    publisher.attempts.length = 0;
    publisher.failures.length = 0;
    publisher.delayMs = 0;
  });

  afterAll(async () => {
    if (observer !== undefined) {
      observer.release();
    }
    if (pool !== undefined) {
      await pool.query(`DROP TABLE IF EXISTS ${OUTBOX_TABLE}`);
      await pool.end();
    }
  });

  it('commits the record with the use case and keeps it invisible until the commit', async () => {
    const event = new OutboxProbeRecorded('INV-1');
    const gate = deferred();
    let duringOpen: RowDataPacket[] = [];

    const commit = boundary.execute(async () => {
      await recorder.record(event);
      // Another connection's plain read: consistent, non-locking, and it sees
      // nothing — the publisher's committed-only view is this same read.
      duringOpen = await committedRows();
      await gate.promise;
    });

    expect(duringOpen).toEqual([]);

    gate.release();
    await commit;

    const row = await oneRow();
    expect(row.state).toBe('pending');
    expect(row.event_id).toBe(event.metadata.messageId);
    expect(row.event_type).toBe('OutboxProbeRecorded');
    expect(row.attempt_count).toBe(0);
    expect(JSON.parse(String(row.payload))).toMatchObject({
      kind: 'event',
      name: 'OutboxProbeRecorded',
      data: { ref: 'INV-1' },
    });

    const summary = await dispatcher.publishBatch();
    expect(summary).toMatchObject({ claimed: 1, published: 1 });
    expect(publisher.attempts).toEqual([
      expect.objectContaining({ eventId: event.metadata.messageId }),
    ]);
  });

  it('rolls the record back with the state change that failed after it, leaving nothing to publish', async () => {
    await expect(
      boundary.execute(async () => {
        await recorder.record(new OutboxProbeRecorded('INV-2'));
        throw new Error('the state change was rejected afterwards');
      }),
    ).rejects.toThrow('the state change was rejected afterwards');

    expect(await committedRows()).toEqual([]);

    const summary = await dispatcher.publishBatch();
    expect(summary).toMatchObject({ claimed: 0, published: 0 });
    expect(publisher.attempts).toEqual([]);
  });

  it('publishes only committed records, and marks them published', async () => {
    const event = new OutboxProbeRecorded('INV-3');
    await boundary.execute(async () => {
      await recorder.record(event);
    });

    const summary = await dispatcher.publishBatch();

    expect(summary).toMatchObject({ claimed: 1, published: 1, retrying: 0, failed: 0 });
    expect(publisher.attempts).toEqual([
      expect.objectContaining({
        eventId: event.metadata.messageId,
        eventType: 'OutboxProbeRecorded',
      }),
    ]);
    const row = await oneRow();
    expect(row.state).toBe('published');
    expect(row.attempt_count).toBe(1);

    // A terminal record is never claimed again.
    const second = await dispatcher.publishBatch();
    expect(second).toMatchObject({ claimed: 0, published: 0 });
    expect(publisher.attempts).toHaveLength(1);
  });

  it('schedules a transient failure for a later attempt, then succeeds with the same identity', async () => {
    const event = new OutboxProbeRecorded('INV-4');
    await boundary.execute(async () => {
      await recorder.record(event);
    });
    publisher.failures.push(new Error('redis is down'));
    // A dispatcher with a production-sized backoff, so "not due yet" is a real
    // window rather than a race against one millisecond.
    const longBackoff = new OutboxPublisher(
      store,
      publisher,
      { ...OUTBOX_CONFIG, retryBaseDelayMs: 60_000, retryMaxDelayMs: 60_000 },
      NO_REDACTION,
    );

    const first = await longBackoff.publishBatch();
    expect(first).toMatchObject({ published: 0, retrying: 1, failed: 0 });

    const row = await oneRow();
    expect(row.state).toBe('retrying');
    expect(row.attempt_count).toBe(1);
    expect(row.next_attempt_at).toBeInstanceOf(Date);
    expect(String(row.payload)).toContain('OutboxProbeRecorded');

    // Not due yet: the backoff is what keeps the claim from spinning.
    const tooEarly = await longBackoff.publishBatch();
    expect(tooEarly.claimed).toBe(0);
    expect(publisher.attempts).toHaveLength(1);

    // When the backoff elapses (fast-forwarded here), the same record is
    // claimed again under the same event identity.
    await pool.query(`UPDATE ${OUTBOX_TABLE} SET next_attempt_at = ?`, [new Date(0)]);
    const second = await dispatcher.publishBatch();

    expect(second).toMatchObject({ published: 1, failed: 0 });
    const settled = await oneRow();
    expect(settled.state).toBe('published');
    expect(settled.attempt_count).toBe(2);
    expect(publisher.attempts.map((attempt) => attempt.eventId)).toEqual([
      event.metadata.messageId,
      event.metadata.messageId,
    ]);
  });

  it('parks a permanent failure as failed, and requeues it back to life', async () => {
    const event = new OutboxProbeRecorded('INV-5');
    await boundary.execute(async () => {
      await recorder.record(event);
    });
    publisher.failures.push(new PermanentPublishError('envelope refused by the stream'));

    const summary = await dispatcher.publishBatch();

    expect(summary).toMatchObject({ published: 0, failed: 1 });
    const failed = await oneRow();
    expect(failed.state).toBe('failed');
    expect(failed.attempt_count).toBe(1);
    expect(String(failed.last_failure)).toContain('PermanentPublishError');

    // Manual recovery: the row keeps its identity, gains a fresh budget.
    expect(await store.requeue(String(failed.id))).toBe(true);
    const recovered = await oneRow();
    expect(recovered.state).toBe('pending');
    expect(recovered.attempt_count).toBe(0);

    const afterRequeue = await dispatcher.publishBatch();
    expect(afterRequeue).toMatchObject({ published: 1 });
    expect((await oneRow()).state).toBe('published');
  });

  it('parks a record whose attempt budget the claim just spent', async () => {
    const event = new OutboxProbeRecorded('INV-6');
    await boundary.execute(async () => {
      await recorder.record(event);
    });
    // Two of three attempts already spent.
    await pool.query(
      `UPDATE ${OUTBOX_TABLE} SET state = 'retrying', attempt_count = 2, next_attempt_at = ?`,
      [new Date(0)],
    );
    publisher.failures.push(new Error('still down'));

    const summary = await dispatcher.publishBatch();

    expect(summary).toMatchObject({ retrying: 0, failed: 1 });
    const row = await oneRow();
    expect(row.state).toBe('failed');
    expect(row.attempt_count).toBe(OUTBOX_CONFIG.maxAttempts);
    expect(String(row.last_failure)).toContain('Error: still down');
  });

  it('releases a crashed run and republishes the record under its original identity', async () => {
    const event = new OutboxProbeRecorded('INV-7');
    await boundary.execute(async () => {
      await recorder.record(event);
    });
    // A run that died between claiming and settling: stale, still publishing.
    await pool.query(
      `UPDATE ${OUTBOX_TABLE} SET state = 'publishing', claim_id = 'crashed-run', ` +
        `attempt_count = 1, last_attempt_at = ?`,
      [new Date(Date.now() - 61_000)],
    );

    const summary = await dispatcher.publishBatch();

    expect(summary).toMatchObject({ released: 1, claimed: 1, published: 1 });
    expect(publisher.attempts).toEqual([
      expect.objectContaining({ eventId: event.metadata.messageId }),
    ]);
    const row = await oneRow();
    expect(row.state).toBe('published');
    expect(row.claim_id).toBeNull();
  });

  it('splits a batch between two concurrent publishers without claiming a record twice', async () => {
    for (let index = 0; index < 10; index += 1) {
      const event = new OutboxProbeRecorded(`INV-${index}`);
      await boundary.execute(async () => {
        await recorder.record(event);
      });
    }
    // Hold each publication long enough for the two runs to overlap on claims.
    publisher.delayMs = 20;

    const [first, second] = await Promise.all([
      dispatcher.publishBatch(),
      dispatcher.publishBatch(),
    ]);

    expect(first.claimed + second.claimed).toBe(10);
    expect(first.published + second.published).toBe(10);

    const eventIds = publisher.attempts.map((attempt) => attempt.eventId);
    expect(eventIds).toHaveLength(10);
    expect(new Set(eventIds).size).toBe(10);

    const rows = await committedRows();
    expect(rows.every((row) => row.state === 'published')).toBe(true);
    expect(rows.every((row) => row.attempt_count === 1)).toBe(true);
  });
});
