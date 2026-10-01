import { env } from 'node:process';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppConfigService } from '../src/infrastructure/config/app-config.service.js';
import { loadConfiguration } from '../src/infrastructure/config/configuration.js';
import { createSecretRedactor } from '../src/infrastructure/config/secrets.js';
import { RedisIdempotencyGuard } from '../src/infrastructure/jobs/idempotency/redis-idempotency.guard.js';
import type { RegisteredJob } from '../src/infrastructure/jobs/job.definition.js';
import { JobDispatcher } from '../src/infrastructure/jobs/job-dispatcher.js';
import { JobEnqueuer } from '../src/infrastructure/jobs/job-enqueuer.js';
import { JobRegistry } from '../src/infrastructure/jobs/job.registry.js';
import type { JobRecord } from '../src/infrastructure/jobs/job.types.js';
import { NestJobLogger } from '../src/infrastructure/jobs/nest-job-logger.js';
import { RedisJobQueue } from '../src/infrastructure/jobs/queue/redis-job-queue.js';
import { SAMPLE_JOBS } from '../src/infrastructure/jobs/sample/sample-jobs.js';
import { SAMPLE_SCHEDULES } from '../src/infrastructure/jobs/sample/sample-schedules.js';
import { DelayedJobPromoter } from '../src/infrastructure/jobs/scheduling/delayed-job-promoter.js';
import { ScheduledJobService } from '../src/infrastructure/jobs/scheduling/scheduled-job.service.js';
import { RedisConnectionService } from '../src/infrastructure/redis/redis-connection.service.js';

/**
 * Integration tests for the job infrastructure, against a real Redis Streams
 * server (FND-007).
 *
 * They are opt-in so the required quality gate keeps running without Redis:
 *
 * ```bash
 * pnpm infra:up
 * REDIS_INTEGRATION=1 pnpm --filter @accounting-saas/backend test
 * ```
 *
 * `env` is imported from `node:process` (rather than read through `process.env`)
 * because the configuration boundary rule reserves `process.env` for the
 * configuration layer; this is a test gate, not application configuration.
 */
const integrationEnabled = env.REDIS_INTEGRATION === '1';

const COUNTER_JOB_TYPE = 'test.counted';
const LEAKY_JOB_TYPE = 'test.leaky';
const SECRET = 'super-secret-value';

let executions = 0;

const countedJob: RegisteredJob = {
  type: COUNTER_JOB_TYPE,
  idempotencyKey: (payload) => `${COUNTER_JOB_TYPE}:${(payload as { key: string }).key}`,
  async execute() {
    executions += 1;

    return { outcome: 'completed' };
  },
};

const leakyJob: RegisteredJob = {
  type: LEAKY_JOB_TYPE,
  async execute() {
    throw new Error(`connection failed with ${SECRET}`);
  },
};

describe.skipIf(!integrationEnabled)('Job infrastructure (integration)', () => {
  const appConfig = new AppConfigService(
    loadConfiguration({
      NODE_ENV: 'test',
      WORKER_MAX_ATTEMPTS: '3',
      WORKER_CONCURRENCY: '2',
      WORKER_RETRY_BASE_DELAY_MS: '20',
      WORKER_RETRY_MAX_DELAY_MS: '60',
      REDIS_HOST: env.REDIS_HOST ?? '127.0.0.1',
      REDIS_PORT: env.REDIS_PORT ?? '6379',
    }),
  );
  const redactor = createSecretRedactor({ MYSQL_PASSWORD: SECRET });
  const connection = new RedisConnectionService(appConfig, redactor);
  const registry = new JobRegistry([...SAMPLE_JOBS, countedJob, leakyJob]);
  const queue = new RedisJobQueue(connection, appConfig);
  const idempotency = new RedisIdempotencyGuard(connection, appConfig);
  const dispatcher = new JobDispatcher(
    registry,
    new NestJobLogger(redactor),
    queue,
    idempotency,
    appConfig,
    redactor,
  );
  const enqueuer = new JobEnqueuer(registry, queue, appConfig);
  const promoter = new DelayedJobPromoter(queue);
  const scheduled = new ScheduledJobService(SAMPLE_SCHEDULES, enqueuer, connection, appConfig);

  async function clearNamespace(): Promise<void> {
    await connection.ensureConnected();
    const keys = await connection.getClient().keys('jobs:test:*');

    if (keys.length > 0) {
      await connection.getClient().del(keys);
    }
  }

  /** Drives the queue the way the Worker loop does until the job settles. */
  async function driveUntilSettled(jobId: string, timeoutMs = 8000): Promise<JobRecord> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      await promoter.promoteDue();
      const claimed = await queue.claim(5, 100);

      for (const job of claimed) {
        await dispatcher.dispatch(job);
      }

      const record = await queue.loadState(jobId);

      if (record !== undefined && (record.status === 'completed' || record.status === 'failed')) {
        return record;
      }

      if (claimed.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
    }

    throw new Error(`Job ${jobId} did not settle within ${timeoutMs}ms`);
  }

  beforeAll(async () => {
    await connection.ensureConnected();
  });

  beforeEach(async () => {
    executions = 0;
    await clearNamespace();
  });

  afterAll(async () => {
    await clearNamespace();
    await connection.onApplicationShutdown();
  });

  it('consumes and completes an enqueued job', async () => {
    const envelope = await enqueuer.enqueue({ type: 'sample.echo', payload: { message: 'hi' } });

    const record = await driveUntilSettled(envelope.jobId);

    expect(record.status).toBe('completed');
    expect(record.attempt).toBe(1);
    expect(record.correlationId).toBe(envelope.correlationId);
    expect(record.startedAt).toEqual(expect.any(String));
    expect(record.completedAt).toEqual(expect.any(String));
  });

  it('retries a transient failure with backoff and then completes', async () => {
    const envelope = await enqueuer.enqueue({
      type: 'sample.retry-then-succeed',
      payload: { succeedOnAttempt: 3 },
    });

    const record = await driveUntilSettled(envelope.jobId);

    expect(record.status).toBe('completed');
    expect(record.attempt).toBe(3);
  });

  it('parks a retryable failure once the attempt budget is exhausted', async () => {
    const envelope = await enqueuer.enqueue({ type: 'sample.retry-exhausted', payload: {} });

    const record = await driveUntilSettled(envelope.jobId);

    expect(record.status).toBe('failed');
    expect(record.attempt).toBe(3);
    expect(record.lastError?.category).toBe('retryable');
  });

  it('parks a non-retryable failure without retrying it', async () => {
    const envelope = await enqueuer.enqueue({ type: 'sample.terminal-failure', payload: {} });

    const record = await driveUntilSettled(envelope.jobId);

    expect(record.status).toBe('failed');
    expect(record.attempt).toBe(1);
    expect(record.lastError?.category).toBe('terminal');
  });

  it('parks a job whose type is not registered, without crashing', async () => {
    const envelope = await enqueuer.enqueue({ type: 'sample.does-not-exist', payload: {} });

    const record = await driveUntilSettled(envelope.jobId);

    expect(record.status).toBe('failed');
    expect(record.lastError?.name).toBe('UnknownJobTypeError');
  });

  it('does not repeat an already-applied job on duplicate delivery', async () => {
    const first = await enqueuer.enqueue({
      type: COUNTER_JOB_TYPE,
      payload: { key: 'once' },
    });
    const second = await enqueuer.enqueue({
      type: COUNTER_JOB_TYPE,
      payload: { key: 'once' },
    });

    await driveUntilSettled(first.jobId);
    await driveUntilSettled(second.jobId);

    expect(executions).toBe(1);
  });

  it('redacts a secret out of a recorded failure', async () => {
    const envelope = await enqueuer.enqueue({ type: LEAKY_JOB_TYPE, payload: {} });

    const record = await driveUntilSettled(envelope.jobId);

    expect(record.lastError?.message).not.toContain(SECRET);
    expect(record.lastError?.message).toContain('[redacted]');
  });

  it('reclaims work from a consumer that stopped before acknowledging', async () => {
    const envelope = await enqueuer.enqueue({
      type: 'sample.echo',
      payload: { message: 'reclaimed' },
    });

    // Simulate the crash: read the entry but never acknowledge it.
    const delivered = await queue.claim(1, 200);
    expect(delivered).toHaveLength(1);

    const reclaimed = await queue.reclaimStale(0, 5);
    expect(reclaimed.map((job) => job.envelope.jobId)).toContain(envelope.jobId);

    for (const job of reclaimed) {
      await dispatcher.dispatch(job);
    }

    expect((await queue.loadState(envelope.jobId))?.status).toBe('completed');
  });

  it('keeps working after a job fails', async () => {
    const failing = await enqueuer.enqueue({ type: 'sample.terminal-failure', payload: {} });
    const succeeding = await enqueuer.enqueue({ type: 'sample.echo', payload: {} });

    expect((await driveUntilSettled(failing.jobId)).status).toBe('failed');
    expect((await driveUntilSettled(succeeding.jobId)).status).toBe('completed');
  });

  it('enqueues scheduled work through the same queue, once per interval', async () => {
    expect(await scheduled.enqueueDue()).toBe(1);

    const claimed = await queue.claim(1, 200);
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.envelope.type).toBe('sample.echo');
    expect(claimed[0]?.envelope.enqueuedBy).toBe('scheduler');

    await dispatcher.dispatch(claimed[0]!);
    expect((await queue.loadState(claimed[0]!.envelope.jobId))?.status).toBe('completed');

    // The interval slot is already claimed, so a second tick must not double-enqueue.
    expect(await scheduled.enqueueDue()).toBe(0);
  });
});
