import type { JobEnvelope, JobRecord } from '../job.types.js';

/**
 * The queue abstraction (FND-007, ADR-008).
 *
 * The API, the Worker and the Scheduler all talk to this port; only the adapter
 * knows that Redis Streams implements it. A payload is never inspected here, so
 * adding a job type never requires a queue change.
 */

/** An envelope delivered to a Worker, with the stream id needed to acknowledge it. */
export interface ClaimedJob {
  readonly streamId: string;
  readonly envelope: JobEnvelope;
}

export interface JobQueuePort {
  /** Adds a fresh job (attempt 1) to the queue. */
  push(envelope: JobEnvelope): Promise<void>;

  /**
   * Reads up to `count` new envelopes for this consumer. Blocks up to `blockMs`
   * when the queue is empty. Returns an empty array on timeout.
   */
  claim(count: number, blockMs: number): Promise<readonly ClaimedJob[]>;

  /** Removes a delivered envelope from the pending list once it is handled. */
  acknowledge(claimed: ClaimedJob): Promise<void>;

  /**
   * Takes over envelopes whose consumer died before acknowledging them, so a
   * crash does not lose work (ADR-004, section 23).
   */
  reclaimStale(minIdleMs: number, count: number): Promise<readonly ClaimedJob[]>;

  /** Writes the lifecycle record, optionally expiring it after `ttlSeconds`. */
  saveState(record: JobRecord, ttlSeconds?: number): Promise<void>;

  /** Reads a lifecycle record. */
  loadState(jobId: string): Promise<JobRecord | undefined>;

  /** Records a `retrying` job and schedules it to be promoted after `delayMs`. */
  scheduleRetry(record: JobRecord, delayMs: number): Promise<void>;

  /**
   * Moves retries whose backoff has elapsed back onto the queue, each as its
   * next attempt. Safe to call from more than one process: an entry is claimed
   * atomically before it is promoted. Returns how many were promoted.
   */
  promoteDue(limit: number): Promise<number>;
}
