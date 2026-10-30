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
import { WorkerModule } from './worker.module.js';

/** The logging layer, held outside `bootstrap` so the failure handler can reuse it. */
let logging: ProcessLogging | undefined;

/**
 * Worker process entry point (FND-007).
 *
 * It loads the same centralized configuration as the HTTP process (FND-003),
 * then creates a Nest application context — no HTTP server — whose
 * `WorkerRunnerService` starts consuming the queue on bootstrap.
 *
 * Logging is installed before the context is created (FND-011), so the
 * framework's own bootstrap lines have the configured shape and redaction.
 */
async function bootstrap(): Promise<void> {
  loadDotEnvFiles();
  const configuration = loadConfiguration();

  logging = createProcessLogging(configuration);

  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: logging.bridge,
  });
  app.enableShutdownHooks();

  logging.logger.info(`${configuration.runtime.serviceName} worker is consuming jobs`, {
    detail: { context: 'Bootstrap' },
  });
}

void bootstrap().catch((error: unknown) => {
  const logger = logging?.logger ?? startupProcessLogger('worker');
  const details = error instanceof Error ? (error.stack ?? error.message) : String(error);

  logger.error('Worker failed to start', {
    error: toLogError(error),
    detail: { context: 'Bootstrap', stack: details },
  });
  process.exitCode = 1;
});
