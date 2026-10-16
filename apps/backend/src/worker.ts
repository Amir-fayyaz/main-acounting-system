import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadConfiguration } from './infrastructure/config/configuration.js';
import { loadDotEnvFiles } from './infrastructure/config/dotenv.js';
import { redactProcessSecrets } from './infrastructure/config/secrets.js';
import { toNestLogLevels } from './nest-log-levels.js';
import { WorkerModule } from './worker.module.js';

/**
 * Worker process entry point (FND-007).
 *
 * It loads the same centralized configuration as the HTTP process (FND-003),
 * then creates a Nest application context — no HTTP server — whose
 * `WorkerRunnerService` starts consuming the queue on bootstrap.
 */
async function bootstrap(): Promise<void> {
  loadDotEnvFiles();
  const configuration = loadConfiguration();

  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: toNestLogLevels(configuration.logging.level),
  });
  app.enableShutdownHooks();

  Logger.log(`${configuration.runtime.serviceName} worker is consuming jobs`, 'Bootstrap');
}

void bootstrap().catch((error: unknown) => {
  const details = error instanceof Error ? (error.stack ?? error.message) : String(error);

  Logger.error('Worker failed to start', redactProcessSecrets(details), 'Bootstrap');
  process.exitCode = 1;
});
