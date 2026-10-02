import type { TransactionRunner } from '../../shared/transaction/transaction-boundary.js';
import type { ActiveTransaction } from '../../shared/transaction/transaction-context.js';
import type { Database } from './database.module.js';

/**
 * Drizzle/MySQL mechanics behind the shared transaction boundary (SHR-005;
 * ADR-004 sections 4–6, 9 and 26).
 *
 * This is the only place that knows a transaction is a connection checked out
 * of the pool with `BEGIN` on it. The boundary decides *when* a transaction
 * exists — which use case opened it, what commits together, what a nested call
 * joins — and hands that decision to `db.transaction`, which resolves with a
 * commit and rejects with a rollback, exactly the two outcomes
 * {@link TransactionRunner} promises. Anything more (nesting rules,
 * propagation, the rollback-only policy) would duplicate behaviour the shared
 * contract already owns and tests without a database.
 *
 * The transaction-scoped handle is published as `{ handle: tx }` so
 * repositories participating through `scopedDatabase` resolve to the very same
 * connection the boundary is holding — one connection, one atomic unit. A
 * repository that runs without an open boundary goes through the pool and
 * commits each statement on its own, which is the correct unit for work that
 * has nothing to be atomic with.
 */
export class DrizzleTransactionRunner implements TransactionRunner {
  public constructor(private readonly database: Database) {}

  public async run<T>(work: (transaction: ActiveTransaction) => Promise<T>): Promise<T> {
    return this.database.transaction(async (transaction) => work({ handle: transaction }));
  }
}
