import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service.js';
import { JobRegistry } from './job.registry.js';
import { JOB_QUEUE } from './job.tokens.js';
import type { JobEnvelope } from './job.types.js';
import type { JobQueuePort } from './queue/job-queue.port.js';

/** What a caller provides to queue a job; the rest is infrastructure detail. */
export interface EnqueueJobInput<TPayload = unknown> {
  readonly type: string;
  readonly payload: TPayload;
  /** Trace id of the originating request; generated when absent. */
  readonly correlationId?: string;
  /** Tenant/owner context (ADR-008, section 12). Required once business jobs exist. */
  readonly companyId?: string;
  readonly jobId?: string;
  readonly version?: number;
  readonly maxAttempts?: number;
  readonly enqueuedBy?: string;
}

/**
 * Builds a job envelope and hands it to the queue (FND-007).
 *
 * This is the only place that knows how a job is labelled, so a caller states
 * *what* to run and the infrastructure decides the id, the correlation id, the
 * attempt budget and the contract version. Registration is looked up when
 * available to inherit the definition's defaults; an unregistered type is still
 * enqueued, and the Worker then parks it as a visible terminal failure rather
 * than the caller losing the request.
 */
@Injectable()
export class JobEnqueuer {
  constructor(
    private readonly registry: JobRegistry,
    @Inject(JOB_QUEUE) private readonly queue: JobQueuePort,
    private readonly config: AppConfigService,
  ) {}

  async enqueue<TPayload>(input: EnqueueJobInput<TPayload>): Promise<JobEnvelope<TPayload>> {
    const definition = this.registry.get(input.type);
    const envelope: JobEnvelope<TPayload> = {
      jobId: input.jobId ?? randomUUID(),
      type: input.type,
      version: input.version ?? definition?.version ?? 1,
      payload: input.payload,
      attempt: 1,
      maxAttempts: input.maxAttempts ?? definition?.maxAttempts ?? this.config.jobs.maxAttempts,
      correlationId: input.correlationId ?? randomUUID(),
      ...(input.companyId !== undefined ? { companyId: input.companyId } : {}),
      createdAt: new Date().toISOString(),
      enqueuedBy: input.enqueuedBy ?? 'api',
    };

    await this.queue.push(envelope);

    return envelope;
  }
}
