import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { AppConfigService } from '../../infrastructure/config/app-config.service.js';
import { toLogError, type Logger } from '../../infrastructure/logging/logger.js';
import { LOGGER } from '../../infrastructure/logging/logging.tokens.js';
import { DelayedJobPromoter } from '../../infrastructure/jobs/scheduling/delayed-job-promoter.js';
import { ScheduledJobService } from '../../infrastructure/jobs/scheduling/scheduled-job.service.js';

/** Pause after a loop-level error, so the scheduler cannot spin on a failure. */
const LOOP_ERROR_BACKOFF_MS = 1000;

/**
 * The Scheduler process loop (FND-007, ADR-008 section 9).
 *
 * It only *produces* work: it promotes retries whose backoff has elapsed and
 * enqueues periodic triggers. It executes no business logic and is never the
 * source of truth — every tick puts a job on the same queue and Worker as a
 * manually enqueued job.
 */
@Injectable()
export class SchedulerRunnerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private running = false;
  private loop?: Promise<void>;

  constructor(
    private readonly config: AppConfigService,
    private readonly promoter: DelayedJobPromoter,
    private readonly scheduled: ScheduledJobService,
    @Inject(LOGGER) private readonly logger: Logger,
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
    const intervalMs = this.config.scheduler.intervalMs;
    this.logger.info('Scheduler started', { detail: { intervalMs } });

    while (this.running) {
      try {
        const promoted = await this.promoter.promoteDue();
        const enqueued = await this.scheduled.enqueueDue();

        if (promoted > 0 || enqueued > 0) {
          this.logger.info('Scheduler tick', { detail: { promoted, enqueued } });
        }

        await delay(intervalMs);
      } catch (error) {
        this.logger.error('Scheduler loop error; retrying', {
          error: toLogError(error),
          detail: { backoffMs: LOOP_ERROR_BACKOFF_MS },
        });
        await delay(LOOP_ERROR_BACKOFF_MS);
      }
    }

    this.logger.info('Scheduler stopped');
  }
}

function delay(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

