import { describe, expect, it } from 'vitest';

import type { TransactionRunner } from './transaction-boundary.js';
import { createTransactionBoundary } from './transaction-boundary.js';
import type { ActiveTransaction } from './transaction-context.js';
import { TransactionContext } from './transaction-context.js';

/**
 * Contract tests for the ambient transaction context (SHR-005; ADR-004,
 * section 6 — the context of a transaction is propagated through approved
 * abstractions, not through parameters or framework scopes).
 *
 * The context is the only way a repository learns that a transaction is open,
 * so what these tests pin down is the propagation itself: it exists exactly
 * while the boundary runs, it reaches through awaits, it carries the handle the
 * adapter needs, and it leaves nothing behind.
 */

const runner: TransactionRunner = {
  run: async <T>(work: (transaction: ActiveTransaction) => Promise<T>): Promise<T> =>
    work({ handle: 'driver-handle' }),
};

const boundary = createTransactionBoundary(runner);

/** Several awaits deep — the shape of a repository called by a use case. */
async function readThreeFramesDown(): Promise<unknown> {
  await Promise.resolve();
  await Promise.resolve();
  return TransactionContext.currentHandle<string>();
}

describe('transaction context — propagation', () => {
  it('reports no transaction outside a boundary', async () => {
    expect(TransactionContext.current()).toBeUndefined();
    expect(TransactionContext.currentHandle<unknown>()).toBeUndefined();

    await boundary.execute(async () => undefined);

    expect(TransactionContext.current()).toBeUndefined();
  });

  it('carries the handle to code awaited several frames below the work', async () => {
    const handle = await boundary.execute(() => readThreeFramesDown());

    expect(handle).toBe('driver-handle');
  });

  it('leaves no transaction behind after a rollback either', async () => {
    await expect(
      boundary.execute(async () => {
        expect(TransactionContext.current()).toBeDefined();
        throw new Error('failed');
      }),
    ).rejects.toThrow('failed');

    expect(TransactionContext.current()).toBeUndefined();
    expect(TransactionContext.currentHandle<unknown>()).toBeUndefined();
  });
});
