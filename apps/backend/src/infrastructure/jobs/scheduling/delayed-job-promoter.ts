import { Inject, Injectable } from '@nestjs/common';
import { JOB_QUEUE } from '../job.tokens.js';
import type { JobQueuePort } from '../queue/job-queue.port.js';

const DEFAULT_PROMOTE_LIMIT = 100;

/**
 * Moves retries whose backoff has elapsed back onto the queue (FND-007).
 *
 * Retry promotion runs wherever a job loop runs: the Worker promotes so retries
 * progress even when the Scheduler is not running, and the Scheduler promotes as
 * its periodic duty. The underlying claim is atomic, so running both is safe.
 */
@Injectable()
export class DelayedJobPromoter {
  constructor(@Inject(JOB_QUEUE) private readonly queue: JobQueuePort) {}

  promoteDue(limit: number = DEFAULT_PROMOTE_LIMIT): Promise<number> {
    return this.queue.promoteDue(limit);
  }
}
