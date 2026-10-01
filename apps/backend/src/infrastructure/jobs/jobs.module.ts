import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/app-config.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { RedisIdempotencyGuard } from './idempotency/redis-idempotency.guard.js';
import { JobDispatcher } from './job-dispatcher.js';
import { JobEnqueuer } from './job-enqueuer.js';
import { JobRegistry } from './job.registry.js';
import {
  IDEMPOTENCY_GUARD,
  JOB_DEFINITIONS,
  JOB_LOGGER,
  JOB_QUEUE,
  SCHEDULED_JOB_DEFINITIONS,
} from './job.tokens.js';
import { NestJobLogger } from './nest-job-logger.js';
import { RedisJobQueue } from './queue/redis-job-queue.js';
import { SAMPLE_JOBS } from './sample/sample-jobs.js';
import { SAMPLE_SCHEDULES } from './sample/sample-schedules.js';
import { DelayedJobPromoter } from './scheduling/delayed-job-promoter.js';
import { ScheduledJobService } from './scheduling/scheduled-job.service.js';

/**
 * Background-job infrastructure (FND-007).
 *
 * The module binds the ports to their Redis adapters and registers the sample
 * jobs and schedule. The HTTP process, the Worker and the Scheduler all import
 * it, so they share one queue abstraction and one configuration contract
 * (ADR-008); only the Worker resolves definitions to execute.
 *
 * The sample registrations are infrastructure, not domain: the first real
 * module adds its own definitions here (or in its own module that exports them)
 * without changing the queue.
 */
@Module({
  imports: [AppConfigModule, RedisModule],
  providers: [
    { provide: JOB_DEFINITIONS, useValue: SAMPLE_JOBS },
    { provide: SCHEDULED_JOB_DEFINITIONS, useValue: SAMPLE_SCHEDULES },
    { provide: JOB_QUEUE, useClass: RedisJobQueue },
    { provide: IDEMPOTENCY_GUARD, useClass: RedisIdempotencyGuard },
    { provide: JOB_LOGGER, useClass: NestJobLogger },
    JobRegistry,
    JobEnqueuer,
    JobDispatcher,
    DelayedJobPromoter,
    ScheduledJobService,
  ],
  exports: [
    JobRegistry,
    JobEnqueuer,
    JobDispatcher,
    DelayedJobPromoter,
    ScheduledJobService,
    JOB_QUEUE,
    JOB_LOGGER,
    IDEMPOTENCY_GUARD,
  ],
})
export class JobsModule {}
