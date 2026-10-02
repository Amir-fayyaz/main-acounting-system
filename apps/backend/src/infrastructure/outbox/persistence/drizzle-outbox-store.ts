import { and, asc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm';

import type { Database } from '../../database/database.module.js';
import { scopedDatabase } from '../../database/scoped-database.js';
import type { OutboxFailure, OutboxStore } from '../outbox-store.port.js';
import {
  OUTBOX_CLAIMABLE_STATES,
  type NewOutboxRecord,
  type OutboxRecord,
} from '../outbox.types.js';
import { outboxEvents } from './outbox.schema.js';

type OutboxRow = typeof outboxEvents.$inferSelect;

/**
 * Drizzle/MySQL implementation of the outbox persistence boundary
 * (SHR-006; ADR-004 section 14).
 *
 * Every statement goes through `scopedDatabase`, so:
 *
 * - `add` runs on the connection the use case's transaction is holding — the
 *   record commits and rolls back with the state change beside it, and stays
 *   invisible to every other connection until that commit;
 * - the read side (`claimDue`) simply takes the shared instance when no
 *   boundary is open, which is what the publisher wants: it must only ever see
 *   committed rows.
 *
 * The claim is the one statement with concurrency semantics: one `UPDATE`
 * moves due rows to `publishing` under a fresh token with `ORDER BY ... LIMIT`
 * (oldest first). MySQL serializes the competing updates on the rows they
 * touch, so two publishers split the batch instead of double-publishing it,
 * and the follow-up `SELECT` keyed by the token returns exactly the rows this
 * run won.
 */
export class DrizzleOutboxStore implements OutboxStore {
  public constructor(private readonly database: Database) {}

  public async add(record: NewOutboxRecord): Promise<void> {
    await scopedDatabase(this.database)
      .insert(outboxEvents)
      .values({
        id: record.id,
        eventId: record.eventId,
        eventType: record.eventType,
        eventVersion: record.eventVersion,
        payload: record.payload,
        tenantId: record.tenantId ?? null,
        correlationId: record.correlationId ?? null,
        causationId: record.causationId ?? null,
        createdAt: record.createdAt,
        state: 'pending',
        attemptCount: 0,
        lastAttemptAt: null,
        lastFailure: null,
        publishedAt: null,
        nextAttemptAt: null,
        claimId: null,
      });
  }

  public async claimDue(
    claimId: string,
    limit: number,
    now: Date,
  ): Promise<readonly OutboxRecord[]> {
    const db = scopedDatabase(this.database);

    await db
      .update(outboxEvents)
      .set({
        state: 'publishing',
        claimId,
        attemptCount: sql`${outboxEvents.attemptCount} + 1`,
        lastAttemptAt: now,
      })
      .where(
        and(
          inArray(outboxEvents.state, [...OUTBOX_CLAIMABLE_STATES]),
          or(isNull(outboxEvents.nextAttemptAt), lte(outboxEvents.nextAttemptAt, now)),
        ),
      )
      .orderBy(asc(outboxEvents.createdAt), asc(outboxEvents.id))
      .limit(limit);

    const rows = await db
      .select()
      .from(outboxEvents)
      .where(eq(outboxEvents.claimId, claimId))
      .orderBy(asc(outboxEvents.createdAt), asc(outboxEvents.id))
      .limit(limit);

    return rows.map(toRecord);
  }

  public async markPublished(id: string, publishedAt: Date): Promise<void> {
    await scopedDatabase(this.database)
      .update(outboxEvents)
      .set({
        state: 'published',
        publishedAt,
        claimId: null,
        nextAttemptAt: null,
        lastFailure: null,
      })
      .where(eq(outboxEvents.id, id));
  }

  public async markRetrying(id: string, failure: OutboxFailure): Promise<void> {
    await scopedDatabase(this.database)
      .update(outboxEvents)
      .set({
        state: 'retrying',
        lastFailure: failure.lastFailure,
        nextAttemptAt: failure.nextAttemptAt ?? null,
        claimId: null,
      })
      .where(eq(outboxEvents.id, id));
  }

  public async markFailed(id: string, failure: OutboxFailure): Promise<void> {
    await scopedDatabase(this.database)
      .update(outboxEvents)
      .set({
        state: 'failed',
        lastFailure: failure.lastFailure,
        nextAttemptAt: null,
        claimId: null,
      })
      .where(eq(outboxEvents.id, id));
  }

  public async releaseStale(olderThan: Date, maxAttempts: number): Promise<number> {
    const db = scopedDatabase(this.database);
    const crashed = and(
      eq(outboxEvents.state, 'publishing'),
      or(isNull(outboxEvents.lastAttemptAt), lte(outboxEvents.lastAttemptAt, olderThan)),
    );
    const released =
      'Released after the publish visibility timeout: the previous attempt did not complete (possible duplicate delivery).';

    // Two statements instead of a CASE: both are plain, indexed updates, and
    // the budget split (`attempt_count` against `maxAttempts`) is data the
    // caller already holds rather than a value that belongs in the schema.
    // Run in order — they scan the same rows, and the second one simply finds
    // the complement once the first has moved its share out of `publishing`.
    const exhausted = await db
      .update(outboxEvents)
      .set({ state: 'failed', claimId: null, nextAttemptAt: null, lastFailure: released })
      .where(and(crashed, sql`${outboxEvents.attemptCount} >= ${maxAttempts}`));
    const recoverable = await db
      .update(outboxEvents)
      .set({ state: 'retrying', claimId: null, nextAttemptAt: null, lastFailure: released })
      .where(and(crashed, sql`${outboxEvents.attemptCount} < ${maxAttempts}`));

    return exhausted[0].affectedRows + recoverable[0].affectedRows;
  }

  public async requeue(id: string): Promise<boolean> {
    const [header] = await scopedDatabase(this.database)
      .update(outboxEvents)
      .set({
        state: 'pending',
        attemptCount: 0,
        lastFailure: null,
        nextAttemptAt: null,
        publishedAt: null,
        claimId: null,
      })
      .where(and(eq(outboxEvents.id, id), eq(outboxEvents.state, 'failed')));

    return header.affectedRows > 0;
  }
}

/** A stored row as the publisher reads it: nulls become "absent", not `null`. */
function toRecord(row: OutboxRow): OutboxRecord {
  return {
    id: row.id,
    eventId: row.eventId,
    eventType: row.eventType,
    eventVersion: row.eventVersion,
    payload: row.payload,
    ...(row.tenantId !== null ? { tenantId: row.tenantId } : {}),
    ...(row.correlationId !== null ? { correlationId: row.correlationId } : {}),
    ...(row.causationId !== null ? { causationId: row.causationId } : {}),
    createdAt: row.createdAt,
    state: row.state,
    attemptCount: row.attemptCount,
    ...(row.lastAttemptAt !== null ? { lastAttemptAt: row.lastAttemptAt } : {}),
    ...(row.lastFailure !== null ? { lastFailure: row.lastFailure } : {}),
    ...(row.publishedAt !== null ? { publishedAt: row.publishedAt } : {}),
    ...(row.nextAttemptAt !== null ? { nextAttemptAt: row.nextAttemptAt } : {}),
    ...(row.claimId !== null ? { claimId: row.claimId } : {}),
  };
}
