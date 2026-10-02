import { defineJob, type RegisteredJob } from '../jobs/job.definition.js';
import {
  defineScheduledJob,
  type RegisteredSchedule,
} from '../jobs/scheduling/scheduled-job.definition.js';
import type { OutboxPublisher } from './outbox.publisher.js';

/**
 * The Worker and Scheduler hooks of the outbox (SHR-006; ADR-005 section 7).
 *
 * The pipeline the architecture asks for is `Outbox → Commit → Dispatcher →
 * Redis Stream`. The dispatcher needs a heartbeat, and this repository already
 * has one: the Scheduler enqueues `outbox.publish` on an interval, and the
 * Worker executes it (FND-007). So the outbox reuses the existing loop
 * instead of growing a second one — the job is a thin tick around
 * {@link OutboxPublisher}, carrying no policy of its own.
 *
 * Why a tick and not "enqueue on commit": the transaction has already returned
 * by the time anyone could enqueue, so a missed tick would strand a committed
 * record. Periodic re-discovery means the *database* is what decides what
 * still needs publishing — a record is picked up on the next tick no matter
 * what crashed in between (ADR-004, section 23).
 */

/** Stable, namespaced job type — registered through `JOB_DEFINITIONS`. */
export const OUTBOX_PUBLISH_JOB_TYPE = 'outbox.publish';

/** Stable schedule type — the Scheduler's slot claim for the tick above. */
export const OUTBOX_SCHEDULE_TYPE = 'outbox.publish.tick';

/**
 * Builds the Worker job: one {@link OutboxPublisher} run, then one structured
 * log line that accounts for every record the run touched.
 *
 * The job succeeds whenever the *batch* settles. Individual events failing is
 * the outbox's own state machine (retry / park), not a job failure: the rows
 * are the source of truth and the next tick returns to them. A store outage,
 * by contrast, throws out of `execute`, and the run simply happens again —
 * nothing was consumed.
 */
export function createOutboxPublishJob(publisher: OutboxPublisher): RegisteredJob {
  return defineJob<Record<string, never>>({
    type: OUTBOX_PUBLISH_JOB_TYPE,
    async execute(context) {
      const summary = await publisher.publishBatch();
      const detail = {
        released: summary.released,
        claimed: summary.claimed,
        published: summary.published,
        retrying: summary.retrying,
        failed: summary.failed,
        ...(summary.failures.length > 0 ? { failures: summary.failures } : {}),
      };
      const fields = {
        jobId: context.jobId,
        type: context.type,
        attempt: context.attempt,
        maxAttempts: context.maxAttempts,
        correlationId: context.correlationId,
        detail,
      };

      context.logger.info('Outbox batch settled', { ...fields, status: 'completed' });

      if (summary.failed > 0) {
        context.logger.error('Outbox events exhausted their attempts and were parked as failed', {
          ...fields,
          status: 'failed',
        });
      } else if (summary.retrying > 0) {
        context.logger.warn('Outbox events failed transiently and were scheduled for retry', {
          ...fields,
          status: 'retrying',
        });
      }

      return { outcome: 'completed', detail };
    },
  });
}

/**
 * Builds the Scheduler trigger: one `outbox.publish` job every `intervalMs`,
 * so due records are rediscovered continuously without anything remembering
 * to ask for them.
 */
export function createOutboxPublishSchedule(intervalMs: number): RegisteredSchedule {
  return defineScheduledJob<Record<string, never>>({
    type: OUTBOX_SCHEDULE_TYPE,
    jobType: OUTBOX_PUBLISH_JOB_TYPE,
    intervalMs,
    payload: () => ({}),
  });
}
