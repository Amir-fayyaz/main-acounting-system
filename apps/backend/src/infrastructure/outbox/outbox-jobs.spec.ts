import { describe, expect, it } from 'vitest';

import type { JobExecutionContext, JobLogFields, JobLogger } from '../jobs/job.types.js';
import {
  createOutboxPublishJob,
  createOutboxPublishSchedule,
  OUTBOX_PUBLISH_JOB_TYPE,
  OUTBOX_SCHEDULE_TYPE,
} from './outbox-jobs.js';
import type { OutboxPublishSummary, OutboxPublisher } from './outbox.publisher.js';

/** A publisher stand-in: returns one canned summary, or throws on demand. */
class StubPublisher {
  public summary: OutboxPublishSummary = {
    released: 0,
    claimed: 0,
    published: 0,
    retrying: 0,
    failed: 0,
    failures: [],
  };
  public error?: Error;
  public calls = 0;

  public async publishBatch(): Promise<OutboxPublishSummary> {
    this.calls += 1;
    if (this.error !== undefined) {
      throw this.error;
    }

    return this.summary;
  }
}

class RecordingLogger implements JobLogger {
  public readonly lines: { level: 'info' | 'warn' | 'error'; fields: JobLogFields }[] = [];

  public info(_message: string, fields: JobLogFields): void {
    this.lines.push({ level: 'info', fields });
  }
  public warn(_message: string, fields: JobLogFields): void {
    this.lines.push({ level: 'warn', fields });
  }
  public error(_message: string, fields: JobLogFields): void {
    this.lines.push({ level: 'error', fields });
  }
}

function context(logger: JobLogger): JobExecutionContext<Record<string, never>> {
  return {
    jobId: 'job-1',
    type: OUTBOX_PUBLISH_JOB_TYPE,
    attempt: 1,
    maxAttempts: 3,
    correlationId: 'flow-1',
    payload: {},
    signal: new AbortController().signal,
    logger,
    idempotency: {
      claim: async () => true,
      release: async () => undefined,
    },
  };
}

function summary(counts: Partial<OutboxPublishSummary>): OutboxPublishSummary {
  return {
    released: 0,
    claimed: 0,
    published: 0,
    retrying: 0,
    failed: 0,
    failures: [],
    ...counts,
  };
}

describe('outbox publish job', () => {
  it('runs one publisher batch and reports the account of the run as detail', async () => {
    const stub = new StubPublisher();
    stub.summary = summary({ claimed: 3, published: 2, retrying: 1, released: 1 });
    const logger = new RecordingLogger();
    const job = createOutboxPublishJob(stub as unknown as OutboxPublisher);

    const result = await job.execute(context(logger));

    expect(stub.calls).toBe(1);
    expect(result).toEqual({
      outcome: 'completed',
      detail: { released: 1, claimed: 3, published: 2, retrying: 1, failed: 0 },
    });
    expect(logger.lines.map((line) => line.level)).toEqual(['info', 'warn']);
    expect(logger.lines[0]).toEqual({
      level: 'info',
      fields: expect.objectContaining({
        jobId: 'job-1',
        type: OUTBOX_PUBLISH_JOB_TYPE,
        status: 'completed',
        detail: { released: 1, claimed: 3, published: 2, retrying: 1, failed: 0 },
      }),
    });
    expect(logger.lines[1]?.fields).toMatchObject({ status: 'retrying' });
  });

  it('completes with an error line when the run parks a record as failed', async () => {
    const stub = new StubPublisher();
    stub.summary = summary({
      claimed: 2,
      published: 1,
      failed: 1,
      failures: [
        {
          id: 'row-1',
          eventId: 'msg-1',
          eventType: 'ProbeRecorded',
          attempt: 5,
          outcome: 'failed',
          failure: 'PermanentPublishError: bad envelope',
        },
      ],
    });
    const logger = new RecordingLogger();
    const job = createOutboxPublishJob(stub as unknown as OutboxPublisher);

    const result = await job.execute(context(logger));

    // The rows are the source of truth: a parked event is outbox state, not a
    // failed tick — the next run finds it exactly where it was left.
    expect(result).toMatchObject({ outcome: 'completed' });
    expect(logger.lines.map((line) => line.level)).toEqual(['info', 'error']);
    expect(logger.lines[1]?.fields.detail).toMatchObject({
      failed: 1,
      failures: [expect.objectContaining({ eventId: 'msg-1', outcome: 'failed' })],
    });
  });

  it('completes with a warning line when the run only scheduled retries', async () => {
    const stub = new StubPublisher();
    stub.summary = summary({ claimed: 1, retrying: 1 });
    const logger = new RecordingLogger();
    const job = createOutboxPublishJob(stub as unknown as OutboxPublisher);

    const result = await job.execute(context(logger));

    expect(result).toMatchObject({ outcome: 'completed' });
    expect(logger.lines.map((line) => line.level)).toEqual(['info', 'warn']);
  });

  it('propagates a store outage so the run is retried instead of reported as success', async () => {
    const stub = new StubPublisher();
    stub.error = new Error('the outbox table is unreachable');
    const logger = new RecordingLogger();
    const job = createOutboxPublishJob(stub as unknown as OutboxPublisher);

    await expect(job.execute(context(logger))).rejects.toThrow('the outbox table is unreachable');
    expect(logger.lines).toEqual([]);
  });
});

describe('outbox publish schedule', () => {
  it('enqueues the outbox tick at the configured interval with an empty payload', () => {
    const schedule = createOutboxPublishSchedule(250);

    expect(schedule).toMatchObject({
      type: OUTBOX_SCHEDULE_TYPE,
      jobType: OUTBOX_PUBLISH_JOB_TYPE,
      intervalMs: 250,
    });
    expect(schedule.payload(new Date())).toEqual({});
  });
});
