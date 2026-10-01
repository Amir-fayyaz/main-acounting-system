import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { AppConfigService } from './infrastructure/config/app-config.service.js';
import { JOB_VISIBILITY_TIMEOUT_MS } from './infrastructure/jobs/job-keys.js';
import { JobDispatcher } from './infrastructure/jobs/job-dispatcher.js';
import { JOB_QUEUE } from './infrastructure/jobs/job.tokens.js';
import type { ClaimedJob, JobQueuePort } from './infrastructure/jobs/queue/job-queue.port.js';
import { DelayedJobPromoter } from './infrastructure/jobs/scheduling/delayed-job-promoter.js';

/** How long a claim blocks when the queue is empty, before the loop re-checks. */
const EMPTY_QUEUE_BLOCK_MS = 2000;

/** Pause after a loop-level error (Redis briefly unavailable), so it cannot spin. */
const LOOP_ERROR_BACKOFF_MS = 1000;

/**
 * The Worker process loop (FND-007, ADR-008).
 *
 * It consumes the queue with the configured concurrency, promotes due retries
 * (so retries progress even when the Scheduler is not running) and reclaims work
 * from a consumer that died before acknowledging it.
 *
 * A single failing job can never take the process down: the dispatcher records
 * its failure, and any error that still escapes is caught here. A Redis outage
 * pauses the loop instead of exiting, so the Worker recovers when Redis returns.
 */
@Injectable()
export class WorkerRunnerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(WorkerRunnerService.name);
  private running = false;
  private loop?: Promise<void>;

  constructor(
    private readonly config: AppConfigService,
    private readonly dispatcher: JobDispatcher,
    private readonly promoter: DelayedJobPromoter,
    @Inject(JOB_QUEUE) private readonly queue: JobQueuePort,
  ) {}

  onApplicationBootstrap(): void {
    this.running = true;
    this.loop = this.run();
  }

  async onApplicationShutdown(): Promise<void> {
    this.running = false;
    await this.loop;
  }

  private async run(): Promise<void> {
    this.logger.log(`Worker started (concurrency ${this.config.jobs.concurrency})`);

    while (this.running) {
      try {
        await this.promoter.promoteDue();

        const stale = await this.queue.reclaimStale(
          JOB_VISIBILITY_TIMEOUT_MS,
          this.config.jobs.concurrency,
        );

        if (stale.length > 0) {
          this.logger.warn(`Reclaimed ${stale.length} job(s) from an interrupted consumer`);
          await this.settle(stale);
        }

        const claimed = await this.queue.claim(this.config.jobs.concurrency, EMPTY_QUEUE_BLOCK_MS);

        if (claimed.length > 0) {
          await this.settle(claimed);
        }
      } catch (error) {
        this.logger.error(`Worker loop error; retrying: ${describeError(error)}`);
        await delay(LOOP_ERROR_BACKOFF_MS);
      }
    }

    this.logger.log('Worker stopped');
  }

  private async settle(jobs: readonly ClaimedJob[]): Promise<void> {
    await Promise.all(jobs.map((job) => this.settleOne(job)));
  }

  private async settleOne(job: ClaimedJob): Promise<void> {
    try {
      await this.dispatcher.dispatch(job);
    } catch (error) {
      // The job stays pending in the stream and is reclaimed later, so nothing
      // is lost; the process stays up.
      this.logger.error(
        `Job ${job.envelope.jobId} (${job.envelope.type}) could not be dispatched: ${describeError(error)}`,
      );
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
