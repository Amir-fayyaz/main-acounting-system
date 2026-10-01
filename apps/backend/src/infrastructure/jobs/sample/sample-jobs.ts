import { defineJob, type RegisteredJob } from '../job.definition.js';
import { RetryableJobError, TerminalJobError } from '../job.errors.js';
import type { JobExecutionResult } from '../job.types.js';

/**
 * Infrastructure-level sample jobs (FND-007).
 *
 * They perform **no business operation** — they log, sleep and throw — and
 * exist so the queue, the Worker, retry/backoff, terminal failure and the
 * metadata hooks can be exercised end to end. A real job replaces the need for
 * them; they are not a template for domain logic.
 */

export interface SampleEchoPayload {
  readonly message?: string;
  /**
   * When set, the job declares an idempotency key, so a second delivery of an
   * already-completed attempt is skipped instead of repeating its effect.
   */
  readonly idempotencyKey?: string;
}

export interface SampleRetryPayload {
  /** Attempt at which the simulated transient failure stops (default 3). */
  readonly succeedOnAttempt?: number;
}

const echoJob = defineJob<SampleEchoPayload>({
  type: 'sample.echo',
  idempotencyKey: (payload) =>
    payload.idempotencyKey === undefined ? undefined : `sample.echo:${payload.idempotencyKey}`,
  async execute(context): Promise<JobExecutionResult> {
    // Demonstrates that the execution metadata is available to a job.
    context.logger.info('Sample echo job executed', {
      jobId: context.jobId,
      type: context.type,
      attempt: context.attempt,
      maxAttempts: context.maxAttempts,
      correlationId: context.correlationId,
      ...(context.companyId !== undefined ? { companyId: context.companyId } : {}),
    });

    return {
      outcome: 'completed',
      detail: { message: context.payload.message ?? 'hello', attempt: context.attempt },
    };
  },
});

const retryThenSucceedJob = defineJob<SampleRetryPayload>({
  type: 'sample.retry-then-succeed',
  async execute(context) {
    const succeedOnAttempt = context.payload.succeedOnAttempt ?? 3;

    if (context.attempt < succeedOnAttempt) {
      throw new RetryableJobError(
        `Simulated transient failure on attempt ${context.attempt} of ${succeedOnAttempt}`,
      );
    }

    return { outcome: 'completed', detail: { attempt: context.attempt } };
  },
});

const retryExhaustedJob = defineJob<Record<string, never>>({
  type: 'sample.retry-exhausted',
  async execute(context) {
    throw new RetryableJobError(`Simulated transient failure on attempt ${context.attempt}`);
  },
});

const terminalFailureJob = defineJob({
  type: 'sample.terminal-failure',
  async execute() {
    throw new TerminalJobError('Simulated non-retryable failure');
  },
});

export const SAMPLE_JOBS: readonly RegisteredJob[] = [
  echoJob,
  retryThenSucceedJob,
  retryExhaustedJob,
  terminalFailureJob,
];
