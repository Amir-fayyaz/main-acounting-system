import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../infrastructure/config/app-config.module.js';
import { JobsModule } from '../../infrastructure/jobs/jobs.module.js';
import { LoggingModule } from '../../infrastructure/logging/logging.module.js';
import { WorkerRunnerService } from './worker-runner.service.js';

/**
 * Application context of the Worker process (FND-007).
 *
 * It is intentionally not an HTTP application: the Worker only consumes the
 * queue. It imports the same `JobsModule` as the API and the Scheduler, so all
 * three share one queue abstraction and one configuration contract, and the same
 * `LoggingModule` (FND-011) so a Worker line has the shape the API's lines have.
 */
@Module({
  imports: [AppConfigModule, LoggingModule, JobsModule],
  providers: [WorkerRunnerService],
})
export class WorkerModule {}
