import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { MetricsService } from '../observability/metrics.service.js';
import { JOB_QUEUE } from './job.tokens.js';
import type { JobQueuePort } from './queue/job-queue.port.js';

/**
 * Sources the `job_queue_depth` gauge from the queue port (FND-014).
 *
 * The metrics layer must not depend on the queue, and the queue port must not
 * depend on Prometheus; this binder is the one place that joins them. At
 * module init it hands the metrics service a provider that reads the stream
 * length on every scrape, so the gauge reflects the live queue instead of a
 * periodically copied number. A failing read (Redis unreachable at scrape
 * time) is swallowed by the gauge's collect step, which keeps the gauge at its
 * last value instead of failing the whole scrape.
 */
@Injectable()
export class JobQueueDepthBinder implements OnModuleInit {
  constructor(
    @Inject(JOB_QUEUE) private readonly queue: JobQueuePort,
    private readonly metrics: MetricsService,
  ) {}

  onModuleInit(): void {
    this.metrics.setQueueDepthProvider(async () => await this.queue.pendingCount());
  }
}
