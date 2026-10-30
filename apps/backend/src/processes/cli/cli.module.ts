import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../infrastructure/config/app-config.module.js';
import { JobsModule } from '../../infrastructure/jobs/jobs.module.js';
import { LoggingModule } from '../../infrastructure/logging/logging.module.js';

/**
 * Standalone application context for job CLI commands (FND-007).
 *
 * It reuses the same configuration and queue as the long-running processes, so a
 * job enqueued from the command line is identical to one enqueued by the API,
 * and logs through the same contract (FND-011).
 */
@Module({
  imports: [AppConfigModule, LoggingModule, JobsModule],
})
export class CliModule {}
