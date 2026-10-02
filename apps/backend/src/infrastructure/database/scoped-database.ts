import { TransactionContext } from '../../shared/transaction/transaction-context.js';
import type { Database } from './database.module.js';

/**
 * The database handle a repository adapter must write through (SHR-005;
 * ADR-004 sections 4–6).
 *
 * A repository receives the shared Drizzle instance once, at construction —
 * but a write only becomes atomic with the operations around it when it runs
 * on the *same* connection the use case's boundary is holding. This is the
 * one-line rule that makes that happen:
 *
 * ```ts
 * // infrastructure/persistence/ accounting-documents.repository.ts
 * const db = scopedDatabase(this.database);
 * await db.insert(accountingDocuments).values(row);
 * ```
 *
 * - **Inside a boundary** it returns the transaction-scoped handle, so the
 *   write is part of that boundary: it commits with it, rolls back with it,
 *   and is invisible to other connections until it does.
 * - **Outside a boundary** it returns the instance the adapter was given,
 *   whose statements are each their own unit of work — the ordinary case for
 *   a read or an independent single write.
 *
 * What it never does is open a transaction of its own: a repository must not
 * silently give a write its own lifecycle when the work around it is expected
 * to be atomic (ADR-004, section 6). Participation is decided by the use case,
 * never by the adapter.
 */
export function scopedDatabase(base: Database): Database {
  return TransactionContext.currentHandle<Database>() ?? base;
}
