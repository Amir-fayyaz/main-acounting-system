import { Inject, Injectable } from '@nestjs/common';
import { SECRET_REDACTOR } from '../config/app-config.tokens.js';
import { AppConfigService } from '../config/app-config.service.js';
import type { SecretHolder } from '../config/secrets.js';
import { classifyJobError } from './job.errors.js';
import type { RegisteredJob } from './job.definition.js';
import { IDEMPOTENCY_TTL_SECONDS, JOB_STATE_TTL_SECONDS } from './job-keys.js';
import { JobRegistry } from './job.registry.js';
import { IDEMPOTENCY_GUARD, JOB_LOGGER, JOB_QUEUE } from './job.tokens.js';
import type {
  IdempotencyGuard,
  JobEnvelope,
  JobExecutionContext,
  JobExecutionResult,
  JobFailure,
  JobLogFields,
  JobLogger,
  JobRecord,
  JobStatus,
} from './job.types.js';
import { computeBackoffDelayMs, hasAttemptsRemaining, type RetryPolicy } from './retry.policy.js';
import type { ClaimedJob, JobQueuePort } from './queue/job-queue.port.js';

/**
 * Executes one claimed job and records its lifecycle (FND-007, ADR-008).
 *
 * The behaviour is deliberately conservative:
 *
 * - The lifecycle record moves `queued → running → completed` or
 *   `running → retrying | failed`, and every transition is written before the
 *   stream entry is acknowledged, so a crash never hides work.
 * - Only an explicit `RetryableJobError` is retried, and only while attempts
 *   remain; the retry is scheduled with bounded, jittered backoff. Anything
 *   else — a business rejection, an unexpected error, an exhausted budget —
 *   becomes a terminal `failed` record that is left for a human to inspect
 *   rather than retried blindly (ADR-004, section 12).
 * - A definition that declares an idempotency key is skipped when a completed
 *   execution already claimed it, so duplicate delivery does not repeat an
 *   effect (ADR-004, section 11).
 */
@Injectable()
export class JobDispatcher {
  private readonly policy: RetryPolicy;

  constructor(
    private readonly registry: JobRegistry,
    @Inject(JOB_LOGGER) private readonly logger: JobLogger,
    @Inject(JOB_QUEUE) private readonly queue: JobQueuePort,
    @Inject(IDEMPOTENCY_GUARD) private readonly idempotency: IdempotencyGuard,
    config: AppConfigService,
    @Inject(SECRET_REDACTOR) private readonly secrets: SecretHolder,
  ) {
    this.policy = {
      maxAttempts: config.jobs.maxAttempts,
      baseDelayMs: config.jobs.retryBaseDelayMs,
      maxDelayMs: config.jobs.retryMaxDelayMs,
    };
  }

  async dispatch(claimed: ClaimedJob): Promise<JobStatus> {
    const { envelope } = claimed;
    const startedAtMs = Date.now();
    const startedAt = new Date(startedAtMs).toISOString();
    const running: JobRecord = { ...envelope, status: 'running', updatedAt: startedAt, startedAt };

    await this.queue.saveState(running);

    const fields: JobLogFields = {
      jobId: envelope.jobId,
      type: envelope.type,
      attempt: envelope.attempt,
      maxAttempts: envelope.maxAttempts,
      correlationId: envelope.correlationId,
      ...(envelope.companyId !== undefined ? { companyId: envelope.companyId } : {}),
    };

    const definition = this.registry.get(envelope.type);

    if (definition === undefined) {
      return await this.failTerminally(claimed, running, startedAtMs, fields, {
        name: 'UnknownJobTypeError',
        message: `No job definition is registered for type "${envelope.type}"`,
        category: 'terminal',
      });
    }

    this.logger.info('Job started', { ...fields, status: 'running' });

    try {
      await this.execute(definition, envelope, fields);
      const completedAt = new Date().toISOString();

      await this.queue.saveState(
        { ...running, status: 'completed', completedAt, updatedAt: completedAt },
        JOB_STATE_TTL_SECONDS.completed,
      );
      await this.queue.acknowledge(claimed);
      this.logger.info('Job completed', {
        ...fields,
        status: 'completed',
        durationMs: Date.now() - startedAtMs,
      });

      return 'completed';
    } catch (error) {
      const failure = this.toFailure(error);

      if (
        failure.category === 'retryable' &&
        hasAttemptsRemaining(envelope.attempt, envelope.maxAttempts)
      ) {
        const retryDelayMs = computeBackoffDelayMs(envelope.attempt, {
          ...this.policy,
          maxAttempts: envelope.maxAttempts,
        });

        await this.queue.scheduleRetry(
          {
            ...running,
            status: 'retrying',
            lastError: failure,
            updatedAt: new Date().toISOString(),
          },
          retryDelayMs,
        );
        await this.queue.acknowledge(claimed);
        this.logger.warn('Job failed; retry scheduled', {
          ...fields,
          status: 'retrying',
          durationMs: Date.now() - startedAtMs,
          error: failure,
          detail: { retryDelayMs },
        });

        return 'retrying';
      }

      return await this.failTerminally(claimed, running, startedAtMs, fields, failure);
    }
  }

  private async execute(
    definition: RegisteredJob,
    envelope: JobEnvelope,
    fields: JobLogFields,
  ): Promise<JobExecutionResult | void> {
    const idempotencyKey = definition.idempotencyKey?.(envelope.payload, envelope);

    if (idempotencyKey !== undefined) {
      const isFirst = await this.idempotency.claim(idempotencyKey, IDEMPOTENCY_TTL_SECONDS);

      if (!isFirst) {
        this.logger.info('Job skipped; its effect was already applied', {
          ...fields,
          status: 'completed',
          detail: { reason: 'duplicate-delivery' },
        });

        return { outcome: 'skipped-duplicate' };
      }
    }

    const controller = new AbortController();
    const context: JobExecutionContext = {
      jobId: envelope.jobId,
      type: envelope.type,
      attempt: envelope.attempt,
      maxAttempts: envelope.maxAttempts,
      correlationId: envelope.correlationId,
      ...(envelope.companyId !== undefined ? { companyId: envelope.companyId } : {}),
      payload: envelope.payload,
      signal: controller.signal,
      logger: this.logger,
      idempotency: this.idempotency,
    };

    try {
      return await definition.execute(context);
    } catch (error) {
      // The attempt did not complete, so release the claim and let the retry (or
      // a later re-run) claim it again. A successful execution keeps the claim.
      if (idempotencyKey !== undefined) {
        await this.idempotency.release(idempotencyKey);
      }

      throw error;
    }
  }

  private async failTerminally(
    claimed: ClaimedJob,
    running: JobRecord,
    startedAtMs: number,
    fields: JobLogFields,
    failure: JobFailure,
  ): Promise<JobStatus> {
    const completedAt = new Date().toISOString();

    await this.queue.saveState(
      { ...running, status: 'failed', completedAt, updatedAt: completedAt, lastError: failure },
      JOB_STATE_TTL_SECONDS.failed,
    );
    await this.queue.acknowledge(claimed);
    this.logger.error(
      failure.category === 'retryable'
        ? 'Job exhausted its attempts and was parked'
        : 'Job failed permanently',
      {
        ...fields,
        status: 'failed',
        durationMs: Date.now() - startedAtMs,
        error: failure,
      },
    );

    return 'failed';
  }

  /** Classifies a thrown value and redacts its message before it is recorded. */
  private toFailure(error: unknown): JobFailure {
    const failure = classifyJobError(error);

    return { ...failure, message: this.secrets.redact(failure.message) };
  }
}
