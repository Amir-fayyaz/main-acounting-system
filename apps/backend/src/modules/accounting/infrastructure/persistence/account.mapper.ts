import type { Revision } from '../../../../shared/persistence/revision.js';
import { DateTime } from '../../../../shared/time/date-time.js';
import { Account } from '../../domain/aggregates/account.js';
import { accounts } from './account.schema.js';

/**
 * The bidirectional mapping between the `accounts` row and the Account
 * aggregate (ACC-001.2; ADR-003 section 16).
 *
 * The persistence model and the Domain aggregate are deliberately separate
 * types: storage is relational columns, the aggregate is invariants and value
 * objects. This file is the only place where the two meet, so a schema change
 * cannot leak a column into Domain code and a Domain refactor cannot silently
 * reshapes a table.
 *
 * Both directions go through the aggregate's own boundary:
 *
 * - **Row → aggregate** uses `Account.rehydrate`, which re-validates every value
 *   object. A corrupted column therefore fails loudly at the edge
 *   (`InvalidPrimitiveError`) instead of becoming a silently wrong account.
 * - **Aggregate → row** uses `Account.snapshot`, so the mapper never reads the
 *   aggregate's private state and never invents a value the Domain did not
 *   expose.
 *
 * Booleans are stored as MySQL `tinyint(1)` and surfaced by the driver as
 * `boolean`; `created_at` / `updated_at` are UTC instants both ways, which is
 * what `DateTime` guarantees (doc 15).
 */

/** A stored `accounts` row. */
export type AccountRow = typeof accounts.$inferSelect;

/** The values an insert supplies for one account. */
export type AccountInsertValues = typeof accounts.$inferInsert;

/**
 * The mutable part of a row: what an update may write.
 *
 * `id`, `tenant_id` and `created_at` are identity and origin, not state — a
 * write never rewrites them, so they are excluded rather than re-sent unchanged.
 * `parent_id`, `level`, `type` and `normal_balance` are included because the
 * Domain may move/reshape a subtree; `revision` because the compare-and-swap
 * advances it.
 */
export type AccountUpdateValues = Omit<AccountInsertValues, 'id' | 'tenantId' | 'createdAt'>;

/**
 * Rebuilds the aggregate from a stored row, re-validating every value object.
 *
 * @throws InvalidPrimitiveError — the row holds a code, type, normal balance or
 * instant the Domain would never construct (a corrupted or hand-edited record).
 */
export function toAccount(row: AccountRow): Account {
  return Account.rehydrate({
    id: row.id,
    tenantId: row.tenantId,
    code: row.code,
    name: row.name,
    level: row.level,
    parentId: row.parentId ?? null,
    type: row.type,
    normalBalance: row.normalBalance,
    postable: row.postable,
    active: row.active,
    system: row.system,
    // `DateTime.from` normalises the driver's `Date` to a UTC instant, so a
    // record read in one timezone and written in another keeps its moment.
    createdAt: DateTime.from(row.createdAt),
    updatedAt: DateTime.from(row.updatedAt),
  });
}

/**
 * The full set of row values for a *new* account.
 *
 * `revision` is the caller's: an insert always starts at
 * `Revision.initial()` (SHR-008), and making it explicit keeps the mapper free
 * of a policy decision.
 */
export function toAccountRow(account: Account, revision: Revision): AccountInsertValues {
  const snapshot = account.snapshot();

  return {
    id: snapshot.id,
    tenantId: snapshot.tenantId,
    code: snapshot.code,
    name: snapshot.name,
    level: snapshot.level,
    parentId: snapshot.parentId,
    type: snapshot.type,
    normalBalance: snapshot.normalBalance,
    postable: snapshot.postable,
    active: snapshot.active,
    system: snapshot.system,
    revision: revision.value,
    createdAt: snapshot.createdAt.toDate(),
    updatedAt: snapshot.updatedAt.toDate(),
  };
}

/**
 * The values an *update* writes, with the revision the compare-and-swap should
 * store on success.
 *
 * The caller passes the expected revision's successor (`expected.next()`), so
 * the mapper stays a pure translation and the concurrency rule remains in the
 * adapter's single `UPDATE … WHERE revision = ?` statement (SHR-008).
 */
export function toAccountUpdateValues(
  account: Account,
  nextRevision: Revision,
): AccountUpdateValues {
  const snapshot = account.snapshot();

  return {
    code: snapshot.code,
    name: snapshot.name,
    level: snapshot.level,
    parentId: snapshot.parentId,
    type: snapshot.type,
    normalBalance: snapshot.normalBalance,
    postable: snapshot.postable,
    active: snapshot.active,
    system: snapshot.system,
    revision: nextRevision.value,
    updatedAt: snapshot.updatedAt.toDate(),
  };
}
