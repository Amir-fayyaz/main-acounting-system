import { describe, expect, it } from 'vitest';

import type {
  TransactionBoundary,
  TransactionRunner,
} from '../transaction/transaction-boundary.js';
import { createTransactionBoundary } from '../transaction/transaction-boundary.js';
import type { ActiveTransaction } from '../transaction/transaction-context.js';
import { TransactionContext } from '../transaction/transaction-context.js';
import { ConflictError, NotFoundError, ValidationError } from '../errors/category-errors.js';
import { ErrorCategory } from '../errors/error-category.js';
import type { DomainError } from '../errors/domain-error.js';
import { Result } from '../errors/result.js';
import { EntityId } from '../id/entity-id.js';
import {
  isConcurrencyConflict,
  staleRevisionConflict,
  staleRevisionOf,
  toConflict,
} from './optimistic-concurrency.js';
import { PersistenceError, PersistenceFailureKind } from './persistence-error.js';
import type {
  AddsAggregate,
  Loaded,
  LoadsById,
  UpdatesAggregate,
  WriteReceipt,
} from './repository-ports.js';
import { Revision } from './revision.js';
import { STALE_REVISION_DETAIL_CODE } from './stale-revision.js';

/**
 * The optimistic-concurrency contract, exercised end to end (SHR-008;
 * ADR-004 section 27).
 *
 * Every test below runs the verification the architecture asks for: two
 * operations load the same protected record, both change it, the first one
 * commits, and the second — writing against the revision it observed — is
 * refused instead of overwriting the winner. The store is an in-memory adapter
 * written against nothing but the shared ports, participating in the shared
 * transaction boundary the same way `scopedDatabase(...)` does, so what is
 * proven here is the mechanism itself: check and mutation as one step, a
 * revision that advances only on success, a failure that is distinguishable
 * from every other failure, and no layer anywhere that retries a business
 * mutation behind the application's back.
 *
 * The module-shaped names below (`Protected*`) stand for whatever the first
 * real module protects — a financial record before posting, an inventory
 * balance, a business transaction — because the mechanism itself is
 * business-free by design.
 */

/** The protected state: enough shape to be changed, no business rules of its own. */
interface ProtectedRecord {
  readonly id: EntityId;
  readonly name: string;
}

interface StoredRow {
  readonly aggregate: ProtectedRecord;
  readonly revision: Revision;
}

/** The repository a module declares from the shared capabilities. */
interface ProtectedRecordsRepository
  extends
    LoadsById<EntityId, ProtectedRecord>,
    AddsAggregate<ProtectedRecord>,
    UpdatesAggregate<ProtectedRecord> {}

/** One open transaction: its own staged rows, invisible until commit. */
interface FakeTransaction {
  readonly overlay: Map<string, StoredRow>;
}

/** What a repository sees: its transaction's rows when one is open, else the store. */
interface RowView {
  get(id: string): StoredRow | undefined;
  set(id: string, row: StoredRow): void;
}

/**
 * The store: committed rows, one overlay per open transaction, and counters for
 * every begin, commit and rollback — enough to prove that a concurrency check
 * and the write it guards share one fate.
 */
class ConcurrentStore {
  public readonly committed = new Map<string, StoredRow>();
  public begins = 0;
  public commits = 0;
  public rollbacks = 0;

  public readonly runner: TransactionRunner = {
    run: async <T>(work: (transaction: ActiveTransaction) => Promise<T>): Promise<T> => {
      this.begins += 1;
      const transaction: FakeTransaction = { overlay: new Map() };

      try {
        const outcome = await work({ handle: transaction });
        for (const [id, row] of transaction.overlay) {
          this.committed.set(id, row);
        }
        this.commits += 1;
        return outcome;
      } catch (error) {
        this.rollbacks += 1;
        throw error;
      }
    },
  };

  public view(transaction: FakeTransaction | undefined): RowView {
    if (transaction === undefined) {
      return {
        get: (id) => this.committed.get(id),
        set: (id, row) => {
          this.committed.set(id, row);
        },
      };
    }

    return {
      get: (id) => transaction.overlay.get(id) ?? this.committed.get(id),
      set: (id, row) => {
        transaction.overlay.set(id, row);
      },
    };
  }
}

/**
 * The adapter stand-in. The compare-and-swap is one synchronous step — the
 * revision test and the write happen with no `await` between them — which is
 * exactly what an `UPDATE ... WHERE revision = ?` does on a real store, and
 * exactly what a check-then-write split would not do.
 */
class InMemoryProtectedRecords implements ProtectedRecordsRepository {
  /** Every attempt to mutate a record, so a hidden retry cannot hide. */
  public updateAttempts = 0;

  public constructor(private readonly store: ConcurrentStore) {}

  public async get(id: EntityId): Promise<Loaded<ProtectedRecord> | undefined> {
    const row = this.rows().get(id.value);
    return row === undefined ? undefined : { aggregate: row.aggregate, revision: row.revision };
  }

  public async add(aggregate: ProtectedRecord): Promise<WriteReceipt> {
    const rows = this.rows();
    if (rows.get(aggregate.id.value) !== undefined) {
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'ProtectedRecords.add');
    }
    const revision = Revision.initial();
    rows.set(aggregate.id.value, { aggregate, revision });
    return { revision };
  }

  public async update(
    aggregate: ProtectedRecord,
    expectedRevision: Revision,
  ): Promise<WriteReceipt> {
    this.updateAttempts += 1;
    const rows = this.rows();
    const row = rows.get(aggregate.id.value);

    if (row === undefined) {
      throw new PersistenceError(PersistenceFailureKind.REJECTED, 'ProtectedRecords.update');
    }
    if (!row.revision.equals(expectedRevision)) {
      throw staleRevisionConflict('ProtectedRecords.update', expectedRevision, row.revision);
    }

    const revision = row.revision.next();
    rows.set(aggregate.id.value, { aggregate, revision });
    return { revision };
  }

  private rows(): RowView {
    return this.store.view(TransactionContext.currentHandle<FakeTransaction>());
  }
}

const recordId = EntityId.from('018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70');
const record = (name: string): ProtectedRecord => ({ id: recordId, name });

/**
 * A representative use case: load, change, write against the revision that was
 * read, and translate a lost race into the shared conflict the caller decides
 * about. It never reloads to "try one more time" — that decision belongs to the
 * application, not to this code and certainly not to the store.
 */
async function renameProtected(
  repository: ProtectedRecordsRepository,
  name: string,
  beforeWrite?: () => Promise<unknown>,
): Promise<Result<ProtectedRecord, DomainError>> {
  const loaded = await repository.get(recordId);
  if (loaded === undefined) {
    return Result.fail(new NotFoundError('No such record.'));
  }

  try {
    await beforeWrite?.();
    await repository.update({ id: loaded.aggregate.id, name }, loaded.revision);
  } catch (error) {
    const conflict = toConflict(error);
    if (conflict !== undefined) {
      return Result.fail(conflict);
    }
    throw error;
  }
  return Result.ok({ id: recordId, name });
}

function deferred(): { promise: Promise<void>; release: () => void } {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
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

function setup(): {
  store: ConcurrentStore;
  repository: InMemoryProtectedRecords;
  boundary: TransactionBoundary;
} {
  const store = new ConcurrentStore();
  return {
    store,
    repository: new InMemoryProtectedRecords(store),
    boundary: createTransactionBoundary(store.runner),
  };
}

describe('optimistic concurrency — the revision a record is loaded at', () => {
  it('hands back the revision the record was stored at', async () => {
    const { repository } = setup();

    const created = await repository.add(record('first'));
    const loaded = await repository.get(recordId);

    expect(created.revision.value).toBe(1);
    expect(loaded?.revision.value).toBe(1);
    expect(loaded?.aggregate).toEqual(record('first'));
  });

  it('reports a record that does not exist as absent, not as a conflict', async () => {
    const { repository } = setup();

    expect(await repository.get(recordId)).toBeUndefined();
    expect((await renameProtected(repository, 'renamed')).error()).toBeInstanceOf(NotFoundError);
  });
});

describe('optimistic concurrency — stale updates', () => {
  it('refuses a write prepared against an older revision and keeps the winner intact', async () => {
    const { store, repository } = setup();
    const created = await repository.add(record('original'));

    const rival = await repository.update(record('rival'), created.revision);

    await expect(repository.update(record('stale'), created.revision)).rejects.toMatchObject({
      name: 'PersistenceError',
      kind: PersistenceFailureKind.CONFLICT,
    });

    expect(rival.revision.value).toBe(2);
    expect(store.committed.get(recordId.value)?.aggregate).toEqual(record('rival'));
    expect(store.committed.get(recordId.value)?.revision.value).toBe(2);
  });

  it('advances the revision only for updates that succeed', async () => {
    const { store, repository } = setup();
    const created = await repository.add(record('one'));
    const second = await repository.update(record('two'), created.revision);

    await expect(repository.update(record('rejected'), created.revision)).rejects.toThrow();
    expect(store.committed.get(recordId.value)?.revision.value).toBe(second.revision.value);

    const third = await repository.update(record('three'), second.revision);
    expect(third.revision.value).toBe(3);
    expect(store.committed.get(recordId.value)?.aggregate).toEqual(record('three'));
  });

  it('cannot be attempted without naming the revision it expects', async () => {
    const { repository } = setup();
    type WriteWithoutRevision = (aggregate: ProtectedRecord) => Promise<WriteReceipt>;

    // @ts-expect-error - the mechanism has no path that writes without an
    // expected revision, so a silent last-write-wins write is unrepresentable.
    const _writeWithoutRevision: WriteWithoutRevision = repository.update;
    expect(_writeWithoutRevision).toBeTypeOf('function');
  });
});

describe('optimistic concurrency — two operations on the same record', () => {
  it('gives both the same revision, then lands only the first write', async () => {
    const { store, repository } = setup();
    await repository.add(record('stored'));

    const [first, second] = await Promise.all([repository.get(recordId), repository.get(recordId)]);
    expect(first?.revision).toEqual(second?.revision);

    const winner = await repository.update(record('first writer'), first!.revision);
    await expect(repository.update(record('second writer'), second!.revision)).rejects.toThrow(
      PersistenceError,
    );

    expect(winner.revision.value).toBe(2);
    expect(store.committed.get(recordId.value)?.aggregate).toEqual(record('first writer'));
    expect(store.committed.get(recordId.value)?.revision.value).toBe(2);
  });

  it('lets exactly one of several concurrent writers win, and reports the rest', async () => {
    const { store, repository } = setup();
    await repository.add(record('anchor'));
    const start = barrier(4);

    const outcomes = await Promise.all(
      ['writer-1', 'writer-2', 'writer-3', 'writer-4'].map(async (name) => {
        const loaded = await repository.get(recordId);
        await start.wait();
        try {
          const receipt = await repository.update(record(name), loaded!.revision);
          return { name, receipt: receipt.revision.value, conflict: undefined };
        } catch (error) {
          return { name, receipt: undefined, conflict: error };
        }
      }),
    );

    const winners = outcomes.filter((outcome) => outcome.receipt !== undefined);
    const losers = outcomes.filter((outcome) => outcome.conflict !== undefined);

    expect(winners).toHaveLength(1);
    expect(winners[0]?.receipt).toBe(2);
    expect(losers).toHaveLength(3);

    for (const loser of losers) {
      expect(loser.conflict).toBeInstanceOf(PersistenceError);
      expect(isConcurrencyConflict(loser.conflict)).toBe(true);
      expect(staleRevisionOf(loser.conflict)).toEqual({ expected: 1, actual: 2 });
    }

    // The winner's write stands; nothing else was applied, and the revision
    // moved exactly once — not once per attempt.
    expect(store.committed.get(recordId.value)?.aggregate).toEqual(record(winners[0]!.name));
    expect(store.committed.get(recordId.value)?.revision.value).toBe(2);
    expect(repository.updateAttempts).toBe(4);
  });

  it('never silently applies the second write over the first', async () => {
    const { store, repository } = setup();
    await repository.add(record('original'));
    const stale = await repository.get(recordId);

    await repository.update(record('rival'), stale!.revision);
    await expect(repository.update(record('mine'), stale!.revision)).rejects.toThrow();

    expect(store.committed.get(recordId.value)?.aggregate).toEqual(record('rival'));
    expect(repository.updateAttempts).toBe(2);
  });
});

describe('optimistic concurrency — a failure the application can distinguish', () => {
  it('marks a stale write as a conflict, carrying the revision that was expected', async () => {
    const { repository } = setup();
    await repository.add(record('original'));
    const stale = await repository.get(recordId);
    await repository.update(record('rival'), stale!.revision);

    let failure: unknown;
    try {
      await repository.update(record('mine'), stale!.revision);
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(PersistenceError);
    expect(isConcurrencyConflict(failure)).toBe(true);
    expect(staleRevisionOf(failure)).toEqual({ expected: 1, actual: 2 });

    const conflict = toConflict(failure);
    expect(conflict).toBeInstanceOf(ConflictError);
    expect(conflict?.category).toBe(ErrorCategory.CONFLICT);
    expect(conflict?.code).toBe('CONFLICT');
    expect(conflict?.message).toBe(
      'The record was changed by someone else. Reload it and try again.',
    );
    expect(conflict?.details).toEqual([
      {
        code: STALE_REVISION_DETAIL_CODE,
        message: 'The record is now at revision 2; this update was prepared against revision 1.',
        field: 'revision',
        expected: 1,
        actual: 2,
      },
    ]);
  });

  it('keeps a validation failure and a technical failure off the conflict path', () => {
    const validation = new ValidationError('The name must not be blank.');
    const unreachable = new PersistenceError(
      PersistenceFailureKind.UNAVAILABLE,
      'ProtectedRecords.get',
    );
    const refused = new PersistenceError(PersistenceFailureKind.REJECTED, 'ProtectedRecords.add');

    for (const failure of [validation, unreachable, refused]) {
      expect(isConcurrencyConflict(failure)).toBe(false);
      expect(toConflict(failure)).toBeUndefined();
    }
    expect(validation.category).toBe(ErrorCategory.VALIDATION);
  });

  it('separates a duplicate identity from a stale revision', () => {
    const duplicate = new PersistenceError(PersistenceFailureKind.CONFLICT, 'ProtectedRecords.add');

    expect(isConcurrencyConflict(duplicate)).toBe(true);
    expect(staleRevisionOf(duplicate)).toBeUndefined();
    expect(toConflict(duplicate)).toBeInstanceOf(ConflictError);
  });

  it('leaves an error that is already the shared conflict untouched', () => {
    const conflict = new ConflictError('Already translated.');

    expect(toConflict(conflict)).toBe(conflict);
    expect(isConcurrencyConflict(conflict)).toBe(true);
  });

  it('reports the conflict as a failure that must not be retried', () => {
    const failure = staleRevisionConflict('ProtectedRecords.update', Revision.initial());

    expect(failure.kind).toBe(PersistenceFailureKind.CONFLICT);
    expect(failure.retryable).toBe(false);
    expect(failure.outcomeKnown).toBe(true);
  });
});

describe('optimistic concurrency — no automatic retry', () => {
  it('attempts a conflicting business mutation exactly once', async () => {
    const { repository } = setup();
    await repository.add(record('original'));
    const beforeTheRace = repository.updateAttempts;

    const result = await renameProtected(repository, 'mine', () =>
      repository.update(record('rival'), Revision.initial()),
    );

    expect(result.isFail()).toBe(true);
    expect(result.error()).toBeInstanceOf(ConflictError);
    // Two attempts in total — the rival's write and the single attempt the
    // losing use case made. Nothing reloaded the record to replay it.
    expect(repository.updateAttempts - beforeTheRace).toBe(2);
    expect((await repository.get(recordId))?.aggregate).toEqual(record('rival'));
  });

  it('does not apply the loser a second time against freshly loaded state', async () => {
    const { store, repository } = setup();
    await repository.add(record('original'));

    const first = await renameProtected(repository, 'first attempt', () =>
      repository.update(record('rival'), Revision.initial()),
    );
    const second = await renameProtected(repository, 'second attempt');

    expect(first.isFail()).toBe(true);
    // The application may decide to try again — that is its decision, made
    // explicitly with a fresh load, not a hidden loop inside the mechanism.
    expect(second.isOk()).toBe(true);
    expect(repository.updateAttempts).toBe(3);
    expect(store.committed.get(recordId.value)?.aggregate).toEqual(record('second attempt'));
    expect(store.committed.get(recordId.value)?.revision.value).toBe(3);
  });
});

describe('optimistic concurrency — inside the transaction boundary (SHR-005)', () => {
  it('rolls the whole boundary back when the update loses its race inside it', async () => {
    const { store, repository, boundary } = setup();
    await repository.add(record('original'));
    const gate = deferred();

    const attempt = boundary.execute(async () => {
      // Work staged before the conflict: it shares the boundary's fate.
      await repository.add({ id: EntityId.generate(), name: 'audit entry' });
      return renameProtected(repository, 'mine', () => gate.promise);
    });

    await boundary.execute(async () => {
      await repository.update(record('rival'), Revision.initial());
    });
    gate.release();

    const outcome = await attempt;

    expect(outcome.isFail()).toBe(true);
    expect(outcome.error()).toBeInstanceOf(ConflictError);
    expect(store.committed.get(recordId.value)?.aggregate).toEqual(record('rival'));
    expect(store.committed.get(recordId.value)?.revision.value).toBe(2);
    expect([...store.committed.values()].map((row) => row.aggregate.name)).not.toContain(
      'audit entry',
    );
    expect(store.commits).toBe(1); // the rival only
    expect(store.rollbacks).toBe(1); // the losing boundary
  });

  it('checks and writes through the same unit of work, visible only at commit', async () => {
    const { store, repository, boundary } = setup();

    const receipt = await boundary.execute(async () => {
      await repository.add(record('first'));
      const loaded = await repository.get(recordId);
      const written = await repository.update(record('second'), loaded!.revision);

      // Still inside the boundary: the check and the write are one unit, and
      // no other reader can see either yet.
      expect(store.committed.size).toBe(0);
      expect(TransactionContext.current()).toBeDefined();
      return written;
    });

    expect(receipt.revision.value).toBe(2);
    expect(store.committed.get(recordId.value)?.aggregate).toEqual(record('second'));
    expect(store.begins).toBe(1);
    expect(store.commits).toBe(1);
    expect(store.rollbacks).toBe(0);
  });

  it('commits a successful update and its advanced revision as one unit', async () => {
    const { store, repository, boundary } = setup();
    await repository.add(record('stored'));

    const result = await boundary.execute(() => renameProtected(repository, 'renamed'));

    expect(result.isOk()).toBe(true);
    expect(store.committed.get(recordId.value)?.aggregate).toEqual(record('renamed'));
    expect(store.committed.get(recordId.value)?.revision.value).toBe(2);
    expect(store.commits).toBe(1);
    expect(store.rollbacks).toBe(0);
  });

  it('leaves the winning write committed when a later operation fails', async () => {
    const { store, repository, boundary } = setup();
    await repository.add(record('stored'));
    const rival = await boundary.execute(() =>
      repository.update(record('rival'), Revision.initial()),
    );
    expect(rival.revision.value).toBe(2);

    await expect(
      boundary.execute(async () => {
        await repository.update(record('mine'), Revision.initial());
      }),
    ).rejects.toMatchObject({ kind: PersistenceFailureKind.CONFLICT });

    expect(store.committed.get(recordId.value)?.aggregate).toEqual(record('rival'));
    expect(store.committed.get(recordId.value)?.revision.value).toBe(2);
    expect(repository.updateAttempts).toBe(2);
  });
});
