import { randomUUID } from 'node:crypto';

import type { OutboxConfiguration } from '../config/configuration.types.js';
import type { SecretHolder } from '../config/secrets.js';
import { computeBackoffDelayMs, type RetryPolicy } from '../jobs/retry.policy.js';
import type { EventPublisherPort, PublishedEvent } from './event-publisher.port.js';
import { describeFailure, isPermanentPublishFailure } from './outbox.errors.js';
import type { OutboxStore } from './outbox-store.port.js';
import type { OutboxRecord } from './outbox.types.js';

/**
 * How long a record may stay in `publishing` before another run treats its
 * owner as crashed and releases it. Publication is a single stream append, so
 * a healthy run finishes far below this; the timeout exists only to recover
 * records whose run died between publishing and marking (ADR-004, section 23).
 */
const PUBLISHING_VISIBILITY_MS = 60_000;

/** One settled attempt, kept for the structured log line a run emits. */
export interface OutboxFailureReport {
  readonly id: string;
  readonly eventId: string;
  readonly eventType: string;
  /** Attempt number this failure ended (1-based). */
  readonly attempt: number;
  readonly outcome: 'retrying' | 'failed';
  readonly failure: string;
}

/** What one `publishBatch` did — the complete, auditable account of a run. */
export interface OutboxPublishSummary {
  /** Records released from a crashed run back into play. */
  readonly released: number;
  /** Records this run claimed. */
  readonly claimed: number;
  readonly published: number;
  readonly retrying: number;
  readonly failed: number;
  readonly failures: readonly OutboxFailureReport[];
}

const EMPTY_SUMMARY: OutboxPublishSummary = {
  released: 0,
  claimed: 0,
  published: 0,
  retrying: 0,
  failed: 0,
  failures: [],
};

/**
 * The Outbox Dispatcher (SHR-006; ADR-004 section 14, ADR-005 section 7): one
 * run over the due records, each claimed, attempted, and settled into exactly
 * one next state.
 *
 * ```text
 * releaseStale → claimDue → publish → markPublished
 *                          ↘ (transient)   markRetrying + bounded backoff
 *                          ↘ (permanent)   markFailed, kept for recovery
 * ```
 *
 * What this class guarantees, and how:
 *
 * - **Nothing publishes before its transaction commits.** It only ever sees
 *   committed rows: `claimDue` reads the store, and the store's `add` rode the
 *   writer's transaction (ADR-004, section 14).
 * - **Bounded, backed-off retry.** A transient failure costs the attempt the
 *   claim already counted and schedules the record at an exponential,
 *   jittered delay capped by configuration; at `maxAttempts` — or on a
 *   {@link PermanentPublishError} — the record becomes `failed` and stays
 *   there, visible, never silently dropped (ADR-004, section 12).
 * - **Duplicates are expected, loss is not.** The record is marked only after
 *   the boundary call resolved; a run that dies in between leaves the row in
 *   `publishing`, and `releaseStale` puts it back in play — so the same
 *   `eventId` can go out twice and consumers deduplicate on it (ADR-004,
 *   section 15). Exactly-once is not claimed anywhere here, because it cannot
 *   be delivered across a crash.
 * - **One owner per record.** The claim is atomic and tagged with a fresh
 *   id, so concurrent runs split the batch instead of sharing rows.
 *
 * The class holds no business rule and no transport: an adapter store and an
 * {@link EventPublisherPort} are injected, and the outcomes come back as a
 * summary the Worker logs.
 */
export class OutboxPublisher {
  private readonly retryPolicy: RetryPolicy;

  public constructor(
    private readonly store: OutboxStore,
    private readonly eventPublisher: EventPublisherPort,
    private readonly config: OutboxConfiguration,
    private readonly secrets: SecretHolder,
  ) {
    this.retryPolicy = {
      maxAttempts: config.maxAttempts,
      baseDelayMs: config.retryBaseDelayMs,
      maxDelayMs: config.retryMaxDelayMs,
    };
  }

  /**
   * One run: recover what a crashed run left behind, then claim and settle a
   * batch of due records. Safe to run from several processes at once — the
   * claim decides who owns what.
   *
   * `now` is a parameter so tests can drive the clock; production passes the
   * default.
   */
  public async publishBatch(now: Date = new Date()): Promise<OutboxPublishSummary> {
    const released = await this.store.releaseStale(
      new Date(now.getTime() - PUBLISHING_VISIBILITY_MS),
      this.config.maxAttempts,
    );

    const claimId = randomUUID();
    const records = await this.store.claimDue(claimId, this.config.batchSize, now);

    if (records.length === 0) {
      return { ...EMPTY_SUMMARY, released };
    }

    let published = 0;
    let retrying = 0;
    let failed = 0;
    const failures: OutboxFailureReport[] = [];

    for (const record of records) {
      try {
        await this.eventPublisher.publish(toPublishedEvent(record));
        await this.store.markPublished(record.id, now);
        published += 1;
      } catch (error) {
        // Wrapped, not passed through: `redact` is a method on the injected
        // holder, and a bare reference would call it without its receiver.
        const failure = describeFailure(error, (text) => this.secrets.redact(text));
        // The claim already counted this attempt, so `attemptCount` is the
        // number of attempts spent — the budget check needs no extra counter.
        const exhausted = record.attemptCount >= this.config.maxAttempts;
        const permanent = isPermanentPublishFailure(error) || exhausted;

        if (permanent) {
          await this.store.markFailed(record.id, { lastFailure: failure });
          failed += 1;
        } else {
          const delayMs = computeBackoffDelayMs(record.attemptCount, this.retryPolicy);
          await this.store.markRetrying(record.id, {
            lastFailure: failure,
            nextAttemptAt: new Date(now.getTime() + delayMs),
          });
          retrying += 1;
        }

        failures.push({
          id: record.id,
          eventId: record.eventId,
          eventType: record.eventType,
          attempt: record.attemptCount,
          outcome: permanent ? 'failed' : 'retrying',
          failure,
        });
      }
    }

    return { released, claimed: records.length, published, retrying, failed, failures };
  }
}

/** The row as the transport sees it: identity columns plus the verbatim payload. */
function toPublishedEvent(record: OutboxRecord): PublishedEvent {
  return {
    eventId: record.eventId,
    eventType: record.eventType,
    eventVersion: record.eventVersion,
    payload: record.payload,
  };
}
