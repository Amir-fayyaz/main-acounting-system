import { describe, expect, it } from 'vitest';

import type { OutboxConfiguration } from '../config/configuration.types.js';
import { SecretRedactor } from '../config/secrets.js';
import type { EventPublisherPort, PublishedEvent } from './event-publisher.port.js';
import { PermanentPublishError } from './outbox.errors.js';
import { OutboxPublisher } from './outbox.publisher.js';
import type { OutboxFailure, OutboxStore } from './outbox-store.port.js';
import type { NewOutboxRecord, OutboxRecord } from './outbox.types.js';

/**
 * Contract tests for the outbox dispatcher (SHR-006; ADR-004 section 14).
 *
 * The store is an in-memory implementation of {@link OutboxStore} that keeps
 * the port's guarantees — due-gated atomic claims, attempts counted by the
 * claim, stale-claim recovery — so the publisher's state machine is exercised
 * against real semantics rather than a stub that agrees with it.
 */

type StoredRecord = OutboxRecord;

class InMemoryOutboxStore implements OutboxStore {
  public readonly rows = new Map<string, StoredRecord>();

  public seed(record: Partial<OutboxRecord> & { id: string }): StoredRecord {
    const stored: StoredRecord = {
      eventId: 'event-1',
      eventType: 'ProbeRecorded',
      eventVersion: 1,
      payload: '{"kind":"event"}',
      createdAt: new Date('2026-10-02T10:00:00.000Z'),
      state: 'pending',
      attemptCount: 0,
      ...record,
    };
    this.rows.set(stored.id, stored);

    return stored;
  }

  public async add(record: NewOutboxRecord): Promise<void> {
    this.seed(record);
  }

  public async claimDue(
    claimId: string,
    limit: number,
    now: Date,
  ): Promise<readonly OutboxRecord[]> {
    const due = [...this.rows.values()]
      .filter(
        (row) =>
          (row.state === 'pending' || row.state === 'retrying') &&
          (row.nextAttemptAt === undefined || row.nextAttemptAt.getTime() <= now.getTime()),
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
      .slice(0, limit);

    return due.map((row) => {
      const claimed: StoredRecord = {
        ...row,
        state: 'publishing',
        claimId,
        attemptCount: row.attemptCount + 1,
        lastAttemptAt: now,
        nextAttemptAt: undefined,
      };
      this.rows.set(claimed.id, claimed);

      return claimed;
    });
  }

  public async markPublished(id: string, publishedAt: Date): Promise<void> {
    this.settle(id, (row) => ({ ...row, state: 'published', publishedAt, claimId: undefined }));
  }

  public async markRetrying(id: string, failure: OutboxFailure): Promise<void> {
    this.settle(id, (row) => ({
      ...row,
      state: 'retrying',
      lastFailure: failure.lastFailure,
      nextAttemptAt: failure.nextAttemptAt,
      claimId: undefined,
    }));
  }

  public async markFailed(id: string, failure: OutboxFailure): Promise<void> {
    this.settle(id, (row) => ({
      ...row,
      state: 'failed',
      lastFailure: failure.lastFailure,
      nextAttemptAt: undefined,
      claimId: undefined,
    }));
  }

  public async releaseStale(olderThan: Date, maxAttempts: number): Promise<number> {
    let released = 0;

    for (const row of this.rows.values()) {
      if (row.state !== 'publishing') {
        continue;
      }
      if (row.lastAttemptAt !== undefined && row.lastAttemptAt.getTime() >= olderThan.getTime()) {
        continue;
      }

      const exhausted = row.attemptCount >= maxAttempts;
      this.rows.set(row.id, {
        ...row,
        state: exhausted ? 'failed' : 'retrying',
        nextAttemptAt: undefined,
        claimId: undefined,
        lastFailure: 'Released after the publish visibility timeout',
      });
      released += 1;
    }

    return released;
  }

  public async requeue(id: string): Promise<boolean> {
    const row = this.rows.get(id);
    if (row === undefined || row.state !== 'failed') {
      return false;
    }
    this.rows.set(id, {
      ...row,
      state: 'pending',
      attemptCount: 0,
      lastFailure: undefined,
      nextAttemptAt: undefined,
      publishedAt: undefined,
      claimId: undefined,
    });

    return true;
  }

  private settle(id: string, transition: (row: StoredRecord) => StoredRecord): void {
    const row = this.rows.get(id);
    if (row === undefined) {
      throw new Error(`no outbox record ${id}`);
    }
    this.rows.set(id, transition(row));
  }
}

class ScriptedPublisher implements EventPublisherPort {
  public readonly attempts: PublishedEvent[] = [];
  /** One entry per call: an `Error` to throw, or `undefined` to succeed. */
  public readonly script: (Error | undefined)[] = [];

  public async publish(event: PublishedEvent): Promise<void> {
    this.attempts.push(event);
    const outcome = this.script.shift() ?? undefined;
    if (outcome !== undefined) {
      throw outcome;
    }
  }
}

const CONFIG: OutboxConfiguration = {
  batchSize: 3,
  maxAttempts: 3,
  retryBaseDelayMs: 1000,
  retryMaxDelayMs: 8000,
  publishIntervalMs: 1000,
};

const NOW = new Date('2026-10-02T12:00:00.000Z');

function setup(config: OutboxConfiguration = CONFIG): {
  store: InMemoryOutboxStore;
  publisher: ScriptedPublisher;
  dispatcher: OutboxPublisher;
} {
  const store = new InMemoryOutboxStore();
  const publisher = new ScriptedPublisher();
  const dispatcher = new OutboxPublisher(store, publisher, config, new SecretRedactor(['hunter2']));

  return { store, publisher, dispatcher };
}

describe('OutboxPublisher — the happy path', () => {
  it('publishes a due record once, verbatim, and marks it published at the run time', async () => {
    const { store, publisher, dispatcher } = setup();
    store.seed({
      id: 'row-1',
      eventId: 'msg-1',
      payload: '{"kind":"event","name":"ProbeRecorded"}',
    });

    const summary = await dispatcher.publishBatch(NOW);

    expect(summary).toMatchObject({
      released: 0,
      claimed: 1,
      published: 1,
      retrying: 0,
      failed: 0,
    });
    expect(publisher.attempts).toEqual([
      {
        eventId: 'msg-1',
        eventType: 'ProbeRecorded',
        eventVersion: 1,
        payload: '{"kind":"event","name":"ProbeRecorded"}',
      },
    ]);
    expect(store.rows.get('row-1')).toMatchObject({
      state: 'published',
      attemptCount: 1,
      publishedAt: NOW,
      claimId: undefined,
    });
  });

  it('claims nothing when nothing is due', async () => {
    const { publisher, dispatcher } = setup();

    const summary = await dispatcher.publishBatch(NOW);

    expect(summary).toMatchObject({ claimed: 0, published: 0, failures: [] });
    expect(publisher.attempts).toEqual([]);
  });

  it('leaves not-yet-due, published, failed and mid-claim records alone', async () => {
    const { store, publisher, dispatcher } = setup();
    store.seed({ id: 'future', state: 'retrying', nextAttemptAt: new Date(NOW.getTime() + 1000) });
    store.seed({ id: 'done', state: 'published' });
    store.seed({ id: 'parked', state: 'failed' });
    store.seed({
      id: 'busy',
      state: 'publishing',
      claimId: 'another-run',
      lastAttemptAt: NOW,
    });
    store.seed({ id: 'due', createdAt: new Date('2026-10-02T10:00:01.000Z') });

    const summary = await dispatcher.publishBatch(NOW);

    expect(summary).toMatchObject({ claimed: 1, published: 1 });
    expect(publisher.attempts.map((event) => event.eventId)).toEqual(['event-1']);
    expect(store.rows.get('busy')).toMatchObject({ state: 'publishing', claimId: 'another-run' });
    expect(store.rows.get('future')).toMatchObject({ state: 'retrying' });
  });

  it('respects the configured batch size, leaving the rest for the next run', async () => {
    const { store, dispatcher } = setup();
    for (let index = 0; index < 5; index += 1) {
      store.seed({
        id: `row-${index}`,
        eventId: `msg-${index}`,
        createdAt: new Date(`2026-10-02T10:00:0${index}.000Z`),
      });
    }

    const first = await dispatcher.publishBatch(NOW);
    const second = await dispatcher.publishBatch(NOW);

    expect(first).toMatchObject({ claimed: 3, published: 3 });
    expect(second).toMatchObject({ claimed: 2, published: 2 });
  });
});

describe('OutboxPublisher — the failure paths', () => {
  it('parks a permanent failure immediately, without spending the budget', async () => {
    const { store, publisher, dispatcher } = setup();
    store.seed({ id: 'row-1', eventId: 'msg-1' });
    publisher.script.push(new PermanentPublishError('envelope refused by the stream'));

    const summary = await dispatcher.publishBatch(NOW);

    expect(summary).toMatchObject({ published: 0, retrying: 0, failed: 1 });
    expect(summary.failures).toEqual([
      {
        id: 'row-1',
        eventId: 'msg-1',
        eventType: 'ProbeRecorded',
        attempt: 1,
        outcome: 'failed',
        failure: 'PermanentPublishError: envelope refused by the stream',
      },
    ]);
    expect(store.rows.get('row-1')).toMatchObject({ state: 'failed', attemptCount: 1 });
    expect(store.rows.get('row-1')?.lastFailure).toBe(
      'PermanentPublishError: envelope refused by the stream',
    );
  });

  it('schedules a transient failure for a bounded, jittered backoff and keeps the failure line', async () => {
    const { store, publisher, dispatcher } = setup();
    store.seed({ id: 'row-1', eventId: 'msg-1' });
    publisher.script.push(new Error('connection refused for hunter2'));

    const summary = await dispatcher.publishBatch(NOW);

    expect(summary).toMatchObject({ published: 0, retrying: 1, failed: 0 });
    const row = store.rows.get('row-1');
    expect(row?.state).toBe('retrying');
    expect(row?.attemptCount).toBe(1);
    // Attempt 1: 1000 ms exponential, halved by jitter at worst.
    expect(row?.nextAttemptAt?.getTime()).toBeGreaterThanOrEqual(NOW.getTime() + 500);
    expect(row?.nextAttemptAt?.getTime()).toBeLessThanOrEqual(NOW.getTime() + 1000);
    expect(row?.lastFailure).toBe('Error: connection refused for [redacted]');
  });

  it('parks the record once the claim spends the last attempt', async () => {
    const { store, publisher, dispatcher } = setup();
    // Two attempts already spent; this claim is the third of three.
    store.seed({ id: 'row-1', eventId: 'msg-1', state: 'retrying', attemptCount: 2 });
    publisher.script.push(new Error('still down'));

    const summary = await dispatcher.publishBatch(NOW);

    expect(summary).toMatchObject({ retrying: 0, failed: 1 });
    expect(store.rows.get('row-1')).toMatchObject({ state: 'failed', attemptCount: 3 });
  });

  it('settles every record of a batch into exactly one next state', async () => {
    const { store, publisher, dispatcher } = setup();
    // Seeded in claim order: oldest first, so the script lines up per record.
    store.seed({ id: 'ok', eventId: 'msg-ok', createdAt: new Date('2026-10-02T10:00:00.000Z') });
    store.seed({
      id: 'flaky',
      eventId: 'msg-flaky',
      createdAt: new Date('2026-10-02T10:00:01.000Z'),
    });
    store.seed({
      id: 'broken',
      eventId: 'msg-broken',
      createdAt: new Date('2026-10-02T10:00:02.000Z'),
    });
    // ok → succeeds; flaky → transient; broken → permanent.
    publisher.script.push(undefined, new Error('timeout'), new PermanentPublishError('bad shape'));

    const summary = await dispatcher.publishBatch(NOW);

    expect(summary).toMatchObject({ claimed: 3, published: 1, retrying: 1, failed: 1 });
    expect(store.rows.get('ok')?.state).toBe('published');
    expect(store.rows.get('flaky')?.state).toBe('retrying');
    expect(store.rows.get('broken')?.state).toBe('failed');
    expect(summary.failures.map((failure) => failure.outcome)).toEqual(['retrying', 'failed']);
  });
});

describe('OutboxPublisher — identity and recovery', () => {
  it('republishes the same event identity on every attempt', async () => {
    const { store, publisher, dispatcher } = setup();
    store.seed({ id: 'row-1', eventId: 'msg-42', payload: '{"kind":"event"}' });
    publisher.script.push(new Error('down'), new Error('down'), undefined);

    await dispatcher.publishBatch(NOW);
    const retryAfter = store.rows.get('row-1')?.nextAttemptAt ?? NOW;
    await dispatcher.publishBatch(retryAfter);
    const secondRetryAfter = store.rows.get('row-1')?.nextAttemptAt ?? NOW;
    await dispatcher.publishBatch(secondRetryAfter);

    expect(store.rows.get('row-1')).toMatchObject({ state: 'published', attemptCount: 3 });
    expect(publisher.attempts.map((event) => event.eventId)).toEqual([
      'msg-42',
      'msg-42',
      'msg-42',
    ]);
    expect(new Set(publisher.attempts.map((event) => event.payload))).toEqual(
      new Set(['{"kind":"event"}']),
    );
  });

  it('does not touch a publishing record whose run may still be alive', async () => {
    const { store, publisher, dispatcher } = setup();
    store.seed({
      id: 'row-1',
      state: 'publishing',
      claimId: 'run-1',
      attemptCount: 1,
      lastAttemptAt: new Date(NOW.getTime() - 5000),
    });

    const summary = await dispatcher.publishBatch(NOW);

    expect(summary).toMatchObject({ released: 0, claimed: 0 });
    expect(store.rows.get('row-1')).toMatchObject({ state: 'publishing', claimId: 'run-1' });
    expect(publisher.attempts).toEqual([]);
  });

  it('releases and republishes a record a crashed run left behind', async () => {
    const { store, publisher, dispatcher } = setup();
    store.seed({
      id: 'row-1',
      eventId: 'msg-1',
      state: 'publishing',
      claimId: 'run-1',
      attemptCount: 1,
      lastAttemptAt: new Date(NOW.getTime() - 61_000),
    });

    const summary = await dispatcher.publishBatch(NOW);

    expect(summary).toMatchObject({ released: 1, claimed: 1, published: 1 });
    expect(publisher.attempts.map((event) => event.eventId)).toEqual(['msg-1']);
    expect(store.rows.get('row-1')?.state).toBe('published');
  });

  it('parks a released record instead of retrying it when its budget is spent', async () => {
    const { store, publisher, dispatcher } = setup();
    store.seed({
      id: 'row-1',
      state: 'publishing',
      claimId: 'run-1',
      attemptCount: 3,
      lastAttemptAt: new Date(NOW.getTime() - 61_000),
    });

    const summary = await dispatcher.publishBatch(NOW);

    expect(summary).toMatchObject({ released: 1, claimed: 0 });
    expect(store.rows.get('row-1')?.state).toBe('failed');
    expect(publisher.attempts).toEqual([]);
  });

  it('keeps a failed record recoverable: requeue gives it a fresh, claimable budget', async () => {
    const { store, dispatcher } = setup();
    store.seed({ id: 'row-1', eventId: 'msg-1', state: 'failed', attemptCount: 3 });

    expect(await store.requeue('row-1')).toBe(true);
    expect(store.rows.get('row-1')).toMatchObject({ state: 'pending', attemptCount: 0 });

    const summary = await dispatcher.publishBatch(NOW);

    expect(summary).toMatchObject({ claimed: 1, published: 1 });
  });

  it('reports nothing to requeue for a record that is not failed', async () => {
    const { store } = setup();
    store.seed({ id: 'row-1', state: 'published' });

    expect(await store.requeue('row-1')).toBe(false);
  });
});
