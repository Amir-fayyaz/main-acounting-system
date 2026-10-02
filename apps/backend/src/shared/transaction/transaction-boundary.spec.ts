import { describe, expect, it } from 'vitest';

import {
  BusinessRuleError,
  ConflictError,
  StateViolationError,
} from '../errors/category-errors.js';
import { Result } from '../errors/result.js';
import { PersistenceError, PersistenceFailureKind } from '../persistence/persistence-error.js';
import type { TransactionBoundary, TransactionRunner } from './transaction-boundary.js';
import { createTransactionBoundary, TransactionBoundaryError } from './transaction-boundary.js';
import type { ActiveTransaction } from './transaction-context.js';
import { TransactionContext } from './transaction-context.js';

/**
 * Contract tests for the transaction boundary (SHR-005).
 *
 * The runner below is the smallest honest stand-in for the future Drizzle one:
 * it keeps committed rows, stages each transaction's writes separately, counts
 * every begin/commit/rollback, and refuses to commit anything when the work
 * rejects — exactly the three questions a real runner answers. The repository
 * resolves its rows through `TransactionContext`, the same participation rule
 * `scopedDatabase` applies to a Drizzle connection. If commit, rollback,
 * nesting and propagation behave here, they behave there; nothing in the
 * contract knows which one it is talking to.
 */

interface StoredRow {
  readonly value: string;
  readonly revision: number;
}

/** One open transaction: its own staged writes, invisible until commit. */
interface FakeTransaction {
  readonly overlay: Map<string, StoredRow>;
}

/** What a repository sees: the transaction's rows when one is open, else the store. */
interface RowView {
  get(id: string): StoredRow | undefined;
  set(id: string, row: StoredRow): void;
}

class InMemoryStore {
  /** The table every observer outside the transaction reads. */
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

  /**
   * The scoped view: a repository asks for the rows of *its* transaction —
   * the active one when a boundary is open, the committed table otherwise.
   */
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

/** The adapter stand-in: the shared ports' shape, participating through the context. */
class ProbeRepository {
  public constructor(private readonly store: InMemoryStore) {}

  public async get(id: string): Promise<StoredRow | undefined> {
    return this.rows().get(id);
  }

  public async add(id: string, value: string): Promise<void> {
    const rows = this.rows();
    if (rows.get(id) !== undefined) {
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'ProbeRepository.add');
    }
    rows.set(id, { value, revision: 1 });
  }

  public async update(id: string, value: string, expectedRevision: number): Promise<void> {
    const rows = this.rows();
    const row = rows.get(id);
    if (row === undefined) {
      throw new PersistenceError(PersistenceFailureKind.REJECTED, 'ProbeRepository.update');
    }
    if (row.revision !== expectedRevision) {
      throw new PersistenceError(PersistenceFailureKind.CONFLICT, 'ProbeRepository.update');
    }
    rows.set(id, { value, revision: expectedRevision + 1 });
  }

  private rows(): RowView {
    return this.store.view(TransactionContext.currentHandle<FakeTransaction>());
  }
}

/** An external provider: calls are recorded wherever they happen, transaction or not. */
class FakeProvider {
  public readonly calls: string[] = [];

  public async charge(reference: string): Promise<void> {
    this.calls.push(reference);
  }
}

function deferred(): { promise: Promise<void>; release: () => void } {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

function setup(): {
  store: InMemoryStore;
  repository: ProbeRepository;
  boundary: TransactionBoundary;
} {
  const store = new InMemoryStore();
  return {
    store,
    repository: new ProbeRepository(store),
    boundary: createTransactionBoundary(store.runner),
  };
}

describe('transaction boundary — commit', () => {
  it('commits every write of one use case as a single unit', async () => {
    const { store, repository, boundary } = setup();

    await boundary.execute(async () => {
      await repository.add('invoice', 'INV-1');
      await repository.add('ledger', 'POST-1');
    });

    expect([...store.committed.keys()].sort()).toEqual(['invoice', 'ledger']);
    expect(store.begins).toBe(1);
    expect(store.commits).toBe(1);
    expect(store.rollbacks).toBe(0);
  });

  it('carries the use case outcome out of the boundary unchanged', async () => {
    const { repository, boundary } = setup();

    const result = await boundary.execute(async () => {
      await repository.add('invoice', 'INV-1');
      return Result.ok('posted');
    });

    expect(result.value()).toBe('posted');
  });

  it('leaves a repository outside any boundary to write on its own (one statement, one unit)', async () => {
    const { store, repository } = setup();

    await repository.add('standalone', 'on its own');

    expect(store.committed.get('standalone')).toEqual({ value: 'on its own', revision: 1 });
    expect(store.begins).toBe(0);
    expect(store.commits).toBe(0);
  });
});

describe('transaction boundary — rollback', () => {
  it('rolls back every write of the boundary when the work fails', async () => {
    const { store, repository, boundary } = setup();

    await expect(
      boundary.execute(async () => {
        await repository.add('invoice', 'INV-1');
        await repository.add('ledger', 'POST-1');
        throw new Error('connection lost');
      }),
    ).rejects.toThrow('connection lost');

    expect(store.committed.size).toBe(0);
    expect(store.begins).toBe(1);
    expect(store.commits).toBe(0);
    expect(store.rollbacks).toBe(1);
  });

  it('rolls back and returns the failure the use case decided about (SHR-002)', async () => {
    const { store, repository, boundary } = setup();

    const result = await boundary.execute(async () => {
      await repository.add('invoice', 'INV-1');
      return Result.fail(new BusinessRuleError('The period is closed.'));
    });

    expect(result.isFail()).toBe(true);
    expect(result.error()).toBeInstanceOf(BusinessRuleError);
    expect(store.committed.size).toBe(0);
    expect(store.rollbacks).toBe(1);
  });

  it('rolls back when a repository refuses the write, leaving the stored record untouched', async () => {
    const { store, repository, boundary } = setup();
    await repository.add('invoice', 'first');

    await expect(
      boundary.execute(async () => {
        await repository.update('invoice', 'mine', 7);
      }),
    ).rejects.toMatchObject({ kind: PersistenceFailureKind.CONFLICT });

    expect(store.committed.get('invoice')).toEqual({ value: 'first', revision: 1 });
    expect(store.rollbacks).toBe(1);
  });
});

describe('transaction boundary — nesting and propagation', () => {
  it('lets a nested use case join the open boundary instead of opening its own', async () => {
    const { store, repository, boundary } = setup();

    await boundary.execute(async () => {
      await repository.add('outer', 'from the outer use case');

      await boundary.execute(async () => {
        await repository.add('inner', 'from the nested use case');

        // Inside the nested call: still one transaction, nothing committed yet.
        expect(store.begins).toBe(1);
        expect(store.commits).toBe(0);
        expect(store.committed.has('inner')).toBe(false);
        expect(store.committed.has('outer')).toBe(false);
      });

      // After the nested call returned: still uncommitted — the outer owns it.
      expect(store.commits).toBe(0);
    });

    expect([...store.committed.keys()].sort()).toEqual(['inner', 'outer']);
    expect(store.begins).toBe(1);
    expect(store.commits).toBe(1);
    expect(store.rollbacks).toBe(0);
  });

  it('publishes one transaction through the whole call chain, and none outside', async () => {
    const { boundary } = setup();
    const observed: (object | undefined)[] = [];

    observed.push(TransactionContext.current());

    await boundary.execute(async () => {
      observed.push(TransactionContext.current());
      await boundary.execute(async () => {
        observed.push(TransactionContext.current());
      });
      observed.push(TransactionContext.current());
    });

    observed.push(TransactionContext.current());

    const [before, outer, nested, afterOuter, afterAll] = observed;
    expect(before).toBeUndefined();
    expect(outer).toBeDefined();
    expect(nested).toBe(outer);
    expect(afterOuter).toBe(outer);
    expect(afterAll).toBeUndefined();
  });

  it('keeps two boundaries running side by side independent of each other', async () => {
    const { boundary } = setup();
    const gate = deferred();
    let firstBefore: object | undefined;
    let firstAfter: object | undefined;
    let secondToken: object | undefined;

    const first = boundary.execute(async () => {
      firstBefore = TransactionContext.current() ?? undefined;
      await gate.promise;
      firstAfter = TransactionContext.current() ?? undefined;
    });
    const second = boundary.execute(async () => {
      secondToken = TransactionContext.current() ?? undefined;
    });

    await second;
    gate.release();
    await first;

    expect(firstBefore).toBeDefined();
    expect(firstAfter).toBe(firstBefore);
    expect(secondToken).toBeDefined();
    expect(secondToken).not.toBe(firstBefore);
    expect(TransactionContext.current()).toBeUndefined();
  });

  it('rolls the whole boundary back when a nested use case fails', async () => {
    const { store, repository, boundary } = setup();

    await expect(
      boundary.execute(async () => {
        await repository.add('outer', 'assembled first');
        await boundary.execute(async () => {
          await repository.add('inner', 'never lands');
          throw new Error('nested failure');
        });
      }),
    ).rejects.toThrow('nested failure');

    expect(store.committed.size).toBe(0);
    expect(store.begins).toBe(1);
    expect(store.commits).toBe(0);
    expect(store.rollbacks).toBe(1);
  });

  it('refuses to commit when a failure inside the boundary was swallowed by the caller', async () => {
    const { store, repository, boundary } = setup();

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
    expect(store.committed.size).toBe(0);
    expect(store.begins).toBe(1);
    expect(store.commits).toBe(0);
    expect(store.rollbacks).toBe(1);
  });

  it('refuses to commit when a nested operation reported a failed Result', async () => {
    const { store, repository, boundary } = setup();
    let caught: unknown;

    try {
      await boundary.execute(async () => {
        await repository.add('outer', 'assembled first');
        await boundary.execute(async () => Result.fail(new BusinessRuleError('Declined.')));
        return Result.ok('caller ignored the failure');
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(TransactionBoundaryError);
    expect(store.committed.size).toBe(0);
    expect(store.rollbacks).toBe(1);
  });
});

describe('transaction boundary — external side effects', () => {
  it('rolls back database work only: a provider call inside the boundary is not undone', async () => {
    const { store, repository, boundary } = setup();
    const provider = new FakeProvider();

    await expect(
      boundary.execute(async () => {
        await repository.add('payment', 'PAY-1');
        await provider.charge('PAY-1');
        throw new Error('the database went away after the provider answered');
      }),
    ).rejects.toThrow('the database went away');

    // The database effect is gone; the provider's effect was never part of it.
    expect(store.committed.size).toBe(0);
    expect(provider.calls).toEqual(['PAY-1']);
  });
});

describe('transaction boundary — optimistic concurrency', () => {
  it('turns a lost race into the shared conflict and rolls back instead of overwriting', async () => {
    const { store, repository, boundary } = setup();
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

    // The rival is another use case with its own boundary, opened from outside
    // the attempt's call stack, committing while the attempt is in flight.
    await boundary.execute(async () => {
      await repository.update('invoice', 'rival', 1);
    });
    gate.release();

    const outcome = await attempt;

    expect(outcome.isFail()).toBe(true);
    expect(outcome.error()).toBeInstanceOf(ConflictError);
    expect(store.committed.has('attempt')).toBe(false);
    expect(store.committed.get('invoice')).toEqual({ value: 'rival', revision: 2 });
    expect(store.commits).toBe(1); // only the rival committed; the seeded row was written outside
    expect(store.rollbacks).toBe(1);
  });

  it('lets a use case revalidate current state inside the boundary before commit', async () => {
    const { store, repository, boundary } = setup();

    const result = await boundary.execute(async () => {
      await repository.add('document', 'v1');
      const current = await repository.get('document');
      if (current?.value !== 'expected') {
        return Result.fail(new StateViolationError('The document no longer matches.'));
      }
      return Result.ok(current);
    });

    expect(result.isFail()).toBe(true);
    expect(result.error()).toBeInstanceOf(StateViolationError);
    expect(store.committed.size).toBe(0);
    expect(store.rollbacks).toBe(1);
  });
});
