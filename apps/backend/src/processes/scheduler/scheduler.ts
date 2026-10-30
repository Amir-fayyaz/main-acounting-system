import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { loadConfiguration } from '../../infrastructure/config/configuration.js';
import { loadDotEnvFiles } from '../../infrastructure/config/dotenv.js';
import { toLogError } from '../../infrastructure/logging/logger.js';
import {
  createProcessLogging,
  startupProcessLogger,
  type ProcessLogging,
} from '../../infrastructure/logging/process-logging.js';
import { SchedulerModule } from './scheduler.module.js';

/** The logging layer, held outside `bootstrap` so the failure handler can reuse it. */
let logging: ProcessLogging | undefined;

/**
 * Scheduler process entry point (FND-007).
 *
 * Like the Worker it loads the centralized configuration (FND-003) and runs as a
 * Nest application context, with no HTTP server. Its runner enqueues periodic
 * triggers and promotes due retries; it never executes a job itself.
 *
 * Logging is installed before the context is created (FND-011), so the
 * framework's own bootstrap lines have the configured shape and redaction.
 */
async function bootstrap(): Promise<void> {
  loadDotEnvFiles();
  const configuration = loadConfiguration();

  logging = createProcessLogging(configuration);

  const app = await NestFactory.createApplicationContext(SchedulerModule, {
    logger: logging.bridge,
  });
  app.enableShutdownHooks();

  logging.logger.info(`${configuration.runtime.serviceName} scheduler is running`, {
    detail: { context: 'Bootstrap' },
  });
}

void bootstrap().catch((error: unknown) => {
  const logger = logging?.logger ?? startupProcessLogger('scheduler');
  const details = error instanceof Error ? (error.stack ?? error.message) : String(error);

  logger.error('Scheduler failed to start', {
    error: toLogError(error),
    detail: { context: 'Bootstrap', stack: details },
  });
  process.exitCode = 1;
});
