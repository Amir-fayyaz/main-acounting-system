import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service.js';
import { RedisConnectionService } from '../../redis/redis-connection.service.js';
import { JobEnqueuer } from '../job-enqueuer.js';
import { jobKeys, type JobKeys } from '../job-keys.js';
import { SCHEDULED_JOB_DEFINITIONS } from '../job.tokens.js';
import type { RegisteredSchedule } from './scheduled-job.definition.js';

/**
 * Turns periodic triggers into queued jobs (FND-007, ADR-008 section 9).
 *
 * A schedule owns a Redis slot key claimed with `SET NX PX <interval>`: only the
 * process that wins the set enqueues, and the key expires with the interval, so
 * a second Scheduler instance or a restart cannot double-enqueue the same tick.
 */
@Injectable()
export class ScheduledJobService {
  private readonly keys: JobKeys;

  constructor(
    @Inject(SCHEDULED_JOB_DEFINITIONS)
    private readonly schedules: readonly RegisteredSchedule[],
    private readonly enqueuer: JobEnqueuer,
    private readonly connection: RedisConnectionService,
    config: AppConfigService,
  ) {
    this.keys = jobKeys(config.environment.name);
  }

  /** Enqueues every schedule whose interval has elapsed; returns how many were queued. */
  async enqueueDue(now: Date = new Date()): Promise<number> {
    let enqueued = 0;

    for (const schedule of this.schedules) {
      const claimed = await this.claimSlot(schedule.type, schedule.intervalMs);

      if (!claimed) {
        continue;
      }

      await this.enqueuer.enqueue({
        type: schedule.jobType,
        payload: schedule.payload(now),
        enqueuedBy: 'scheduler',
        ...(schedule.companyId !== undefined ? { companyId: schedule.companyId } : {}),
      });
      enqueued += 1;
    }

    return enqueued;
  }

  private async claimSlot(type: string, intervalMs: number): Promise<boolean> {
    await this.connection.ensureConnected();
    const result = await this.connection
      .getClient()
      .set(this.keys.schedule(type), String(Date.now()), {
        condition: 'NX',
        expiration: { type: 'PX', value: intervalMs },
      });

    return result === 'OK';
  }
}
