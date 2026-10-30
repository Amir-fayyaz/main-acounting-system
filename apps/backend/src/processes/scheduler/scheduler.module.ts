import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../infrastructure/config/app-config.module.js';
import { JobsModule } from '../../infrastructure/jobs/jobs.module.js';
import { LoggingModule } from '../../infrastructure/logging/logging.module.js';
import { SchedulerRunnerService } from './scheduler-runner.service.js';

/**
 * Application context of the Scheduler process (FND-007).
 *
 * It produces work only; it never executes a job. It shares `JobsModule` with
 * the API and the Worker, so a scheduled trigger and a manually enqueued job are
 * indistinguishable once they reach the queue, and it imports `LoggingModule`
 * (FND-011) so its lines have the same shape.
 */
@Module({
  imports: [AppConfigModule, LoggingModule, JobsModule],
  providers: [SchedulerRunnerService],
})
export class SchedulerModule {}
