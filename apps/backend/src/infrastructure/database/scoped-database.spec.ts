import { describe, expect, it } from 'vitest';

import type { TransactionRunner } from '../../shared/transaction/transaction-boundary.js';
import { createTransactionBoundary } from '../../shared/transaction/transaction-boundary.js';
import type { Database } from './database.module.js';
import { scopedDatabase } from './scoped-database.js';

/**
 * The repository-participation rule of the transaction boundary (SHR-005).
 *
 * `scopedDatabase` is what a repository adapter calls instead of using its
 * injected instance directly: it must resolve to the connection the open
 * boundary is holding, and to the plain pool when there is none — never to a
 * transaction of its own. Both halves are checked here against the shared
 * boundary, so the behaviour a Drizzle adapter gets is the behaviour the
 * contract tests already pinned down.
 */

const base = {} as Database;
const scoped = {} as Database;

const runner: TransactionRunner = {
  run: async <T>(work: (transaction: { handle: unknown }) => Promise<T>): Promise<T> =>
    work({ handle: scoped }),
};

const boundary = createTransactionBoundary(runner);

describe('scopedDatabase — participation in the application transaction', () => {
  it('returns the shared instance when no boundary is open (each statement its own unit)', () => {
    expect(scopedDatabase(base)).toBe(base);
  });

  it('returns the transaction-scoped handle while a boundary is open', async () => {
    await boundary.execute(async () => {
      expect(scopedDatabase(base)).toBe(scoped);
    });
  });

  it('returns the shared instance again once the boundary has ended', async () => {
    await boundary.execute(async () => undefined);

    expect(scopedDatabase(base)).toBe(base);
  });
});
