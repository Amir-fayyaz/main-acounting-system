import { describe, expect, it } from 'vitest';

import { DomainEvent } from '../../shared/messaging/domain-event.js';
import type { MessageOptions } from '../../shared/messaging/message-metadata.js';
import type { ActiveTransaction } from '../../shared/transaction/transaction-context.js';
import type {
  TransactionBoundary,
  TransactionRunner,
} from '../../shared/transaction/transaction-boundary.js';
import { createTransactionBoundary } from '../../shared/transaction/transaction-boundary.js';
import { TransactionContext } from '../../shared/transaction/transaction-context.js';
import { OutboxTransactionRequiredError } from './outbox.errors.js';
import { OutboxRecorder } from './outbox-recorder.js';
import type { OutboxStore } from './outbox-store.port.js';
import type { NewOutboxRecord, OutboxRecord } from './outbox.types.js';

/**
 * Contract tests for the outbox write side (SHR-006; ADR-004 section 14).
 *
 * The store below is the same honest stand-in the transaction-boundary spec
 * uses: writes land in the open transaction's overlay and only reach the
 * committed table when the runner commits — so "the record rides the same
 * transaction" is tested as commit/rollback behavior, not as a mock call.
 */

interface StagedTransaction {
  readonly overlay: NewOutboxRecord[];
}

class OverlayOutboxStore implements OutboxStore {
  public readonly committed: NewOutboxRecord[] = [];
  public begins = 0;
  public commits = 0;
  public rollbacks = 0;

  public readonly runner: TransactionRunner = {
    run: async <T>(work: (transaction: ActiveTransaction) => Promise<T>): Promise<T> => {
      this.begins += 1;
      const transaction: StagedTransaction = { overlay: [] };

      try {
        const outcome = await work({ handle: transaction });
        this.committed.push(...transaction.overlay);
        this.commits += 1;
        return outcome;
      } catch (error) {
        this.rollbacks += 1;
        throw error;
      }
    },
  };

  public async add(record: NewOutboxRecord): Promise<void> {
    const open = TransactionContext.currentHandle<StagedTransaction>();

    if (open === undefined) {
      this.committed.push(record);
      return;
    }
    open.overlay.push(record);
  }

  public async claimDue(): Promise<readonly OutboxRecord[]> {
    throw new Error('the write side never claims');
  }
  public async markPublished(): Promise<void> {
    throw new Error('the write side never settles');
  }
  public async markRetrying(): Promise<void> {
    throw new Error('the write side never settles');
  }
  public async markFailed(): Promise<void> {
    throw new Error('the write side never settles');
  }
  public async releaseStale(): Promise<number> {
    throw new Error('the write side never releases');
  }
  public async requeue(): Promise<boolean> {
    throw new Error('the write side never requeues');
  }
}

class ProbeRecorded extends DomainEvent<{ readonly ref: string }> {
  public constructor(data: { readonly ref: string }, options?: MessageOptions) {
    super('ProbeRecorded', data, options);
  }
}

function setup(): {
  store: OverlayOutboxStore;
  recorder: OutboxRecorder;
  boundary: TransactionBoundary;
} {
  const store = new OverlayOutboxStore();

  return {
    store,
    recorder: new OutboxRecorder(store),
    boundary: createTransactionBoundary(store.runner),
  };
}

describe('OutboxRecorder — the boundary rule', () => {
  it('refuses to record with no transaction open, writing nothing', async () => {
    const { store, recorder } = setup();

    await expect(recorder.record(new ProbeRecorded({ ref: 'INV-1' }))).rejects.toBeInstanceOf(
      OutboxTransactionRequiredError,
    );

    expect(store.committed).toEqual([]);
    expect(store.begins).toBe(0);
  });

  it('records inside the boundary and commits the record with the state change', async () => {
    const { store, recorder, boundary } = setup();

    await boundary.execute(async () => {
      await recorder.record(new ProbeRecorded({ ref: 'INV-1' }));
    });

    expect(store.committed).toHaveLength(1);
    expect(store.commits).toBe(1);
    expect(store.rollbacks).toBe(0);
  });

  it('rolls the record back with the use case that produced it', async () => {
    const { store, recorder, boundary } = setup();

    await expect(
      boundary.execute(async () => {
        await recorder.record(new ProbeRecorded({ ref: 'INV-1' }));
        throw new Error('the state change was rejected afterwards');
      }),
    ).rejects.toThrow('the state change was rejected afterwards');

    expect(store.committed).toEqual([]);
    expect(store.commits).toBe(0);
    expect(store.rollbacks).toBe(1);
  });
});

describe('OutboxRecorder — what the record carries', () => {
  it('stores the envelope as it serializes, with the event identity as the key', async () => {
    const { store, recorder, boundary } = setup();
    const event = new ProbeRecorded({ ref: 'INV-1' });

    await boundary.execute(async () => {
      await recorder.record(event);
    });

    const [record] = store.committed;
    expect(record).toBeDefined();
    expect(record?.eventId).toBe(event.metadata.messageId);
    expect(record?.eventType).toBe('ProbeRecorded');
    expect(record?.eventVersion).toBe(event.metadata.version);
    expect(record?.payload).toBe(JSON.stringify(event.toJSON()));
    expect(record?.createdAt).toBeInstanceOf(Date);
    expect(record?.id).not.toBe(event.metadata.messageId);
    expect(JSON.parse(record?.payload ?? '{}')).toMatchObject({
      kind: 'event',
      name: 'ProbeRecorded',
      data: { ref: 'INV-1' },
    });
  });

  it('lifts the queryable metadata into columns without touching the envelope', async () => {
    const { store, recorder, boundary } = setup();
    const event = new ProbeRecorded(
      { ref: 'INV-1' },
      { tenantId: 'tenant-1', correlationId: 'flow-1', causationId: 'cmd-1' },
    );

    await boundary.execute(async () => {
      await recorder.record(event);
    });

    const [record] = store.committed;
    expect(record).toMatchObject({
      tenantId: 'tenant-1',
      correlationId: 'flow-1',
      causationId: 'cmd-1',
    });
    expect(JSON.parse(record?.payload ?? '{}').metadata).toMatchObject({
      tenantId: 'tenant-1',
      correlationId: 'flow-1',
      causationId: 'cmd-1',
    });
  });

  it('gives every recorded event its own row identity', async () => {
    const { store, recorder, boundary } = setup();

    await boundary.execute(async () => {
      await recorder.record(new ProbeRecorded({ ref: 'INV-1' }));
      await recorder.record(new ProbeRecorded({ ref: 'INV-2' }));
    });

    const ids = store.committed.map((record) => record.id);
    expect(new Set(ids).size).toBe(2);
    expect(new Set(store.committed.map((record) => record.eventId)).size).toBe(2);
  });
});
