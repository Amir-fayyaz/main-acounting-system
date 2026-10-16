import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadConfiguration } from './infrastructure/config/configuration.js';
import { loadDotEnvFiles } from './infrastructure/config/dotenv.js';
import { redactProcessSecrets } from './infrastructure/config/secrets.js';
import { toNestLogLevels } from './nest-log-levels.js';
import { SchedulerModule } from './scheduler.module.js';

/**
 * Scheduler process entry point (FND-007).
 *
 * Like the Worker it loads the centralized configuration (FND-003) and runs as a
 * Nest application context, with no HTTP server. Its runner enqueues periodic
 * triggers and promotes due retries; it never executes a job itself.
 */
async function bootstrap(): Promise<void> {
  loadDotEnvFiles();
  const configuration = loadConfiguration();

  const app = await NestFactory.createApplicationContext(SchedulerModule, {
    logger: toNestLogLevels(configuration.logging.level),
  });
  app.enableShutdownHooks();

  Logger.log(`${configuration.runtime.serviceName} scheduler is running`, 'Bootstrap');
}

void bootstrap().catch((error: unknown) => {
  const details = error instanceof Error ? (error.stack ?? error.message) : String(error);

  Logger.error('Scheduler failed to start', redactProcessSecrets(details), 'Bootstrap');
  process.exitCode = 1;
});
