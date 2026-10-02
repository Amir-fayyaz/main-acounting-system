import type { NewOutboxRecord, OutboxRecord } from './outbox.types.js';

/**
 * The outbox persistence boundary (SHR-006; ADR-003, ADR-004 section 14).
 *
 * This is the whole vocabulary the outbox needs of a store — write a record
 * inside the caller's transaction, claim a due batch, and record one of the
 * three outcomes. It ships no query language, no delete and no ORM type: the
 * table, the columns and the connection belong to the adapter, exactly as the
 * module repository ports do (doc 18).
 *
 * Two properties every adapter must hold, because the publisher's guarantees
 * rest on them:
 *
 * - **`add` joins the open transaction.** It writes through
 *   `scopedDatabase`, so the record commits and rolls back with the state
 *   change recorded beside it, and is invisible to readers until that commit.
 * - **`claimDue` claims atomically.** A record moves from a claimable state
 *   to `publishing` under its fresh `claimId` in one statement, so two
 *   concurrent publishers never hold the same record, and a record already
 *   claimed is not claimable again until it is released.
 */
export interface OutboxStore {
  /** Writes a fresh record as `pending`, inside the caller's transaction. */
  add(record: NewOutboxRecord): Promise<void>;

  /**
   * Atomically claims up to `limit` due records for this run: claimable state,
   * `nextAttemptAt` elapsed, oldest first — each moved to `publishing`, tagged
   * with `claimId`, and counted (`attemptCount` + 1, `lastAttemptAt = now`).
   * Returns exactly the rows this claim took.
   */
  claimDue(claimId: string, limit: number, now: Date): Promise<readonly OutboxRecord[]>;

  /** `publishing → published`: the record was handed to the publication boundary. */
  markPublished(id: string, publishedAt: Date): Promise<void>;

  /**
   * `publishing → retrying`: a transient failure; due again at
   * `failure.nextAttemptAt`, with the failure line kept for the audit trail.
   */
  markRetrying(id: string, failure: OutboxFailure): Promise<void>;

  /** `publishing → failed`: permanent, or the attempt budget is spent. */
  markFailed(id: string, failure: OutboxFailure): Promise<void>;

  /**
   * Releases records a crashed run left in `publishing`: past the visibility
   * timeout they are back in play — `retrying` while attempts remain,
   * `failed` when they do not — so a run that died between publishing and
   * marking is retried instead of stranded (ADR-004, section 23). Returns how
   * many records were released.
   */
  releaseStale(olderThan: Date, maxAttempts: number): Promise<number>;

  /**
   * Manual recovery: a `failed` record goes back to `pending` with a fresh
   * attempt budget. Returns `false` when the record is not failed, so the
   * caller sees "nothing to recover" instead of a silent no-op.
   */
  requeue(id: string): Promise<boolean>;
}

/** The failure half of a `publishing → retrying` / `publishing → failed` transition. */
export interface OutboxFailure {
  /** The short, redaction-safe line stored in `last_failure`. */
  readonly lastFailure: string;
  /** When the record becomes due again; omitted for `failed`. */
  readonly nextAttemptAt?: Date;
}
