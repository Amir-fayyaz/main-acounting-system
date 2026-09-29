import 'reflect-metadata';
import { Logger, type LogLevel as NestLogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApplication } from './bootstrap.js';
import type { LogLevel } from './infrastructure/config/configuration.types.js';
import { loadConfiguration } from './infrastructure/config/configuration.js';
import { loadDotEnvFiles } from './infrastructure/config/dotenv.js';
import { redactProcessSecrets } from './infrastructure/config/secrets.js';

/**
 * Maps the configured log level to the levels NestJS knows about.
 *
 * The mapping lives at the process boundary: the configuration layer states
 * *what* the level is, and the HTTP process decides how its framework applies it.
 */
function toNestLogLevels(level: LogLevel): NestLogLevel[] {
  switch (level) {
    case 'debug':
      return ['error', 'warn', 'log', 'debug', 'verbose'];
    case 'info':
      return ['error', 'warn', 'log'];
    case 'warn':
      return ['error', 'warn'];
    case 'error':
      return ['error'];
  }
}

async function bootstrap(): Promise<void> {
  // Configuration is loaded (and validated) before anything else is created, so
  // an invalid value stops the process without half-starting it (FND-003).
  loadDotEnvFiles();
  const configuration = loadConfiguration();

  const app = await NestFactory.create(AppModule, {
    logger: toNestLogLevels(configuration.logging.level),
  });
  const config = configureApplication(app);

  await app.listen(config.port, config.host);

  Logger.log(
    `${config.runtime.serviceName} listening on http://${config.host}:${config.port}${config.apiPrefix} (${config.environment.name})`,
    'Bootstrap',
  );
}

void bootstrap().catch((error: unknown) => {
  // Never swallow a startup failure: report the cause and fail the process so
  // the container/orchestrator can restart or surface it (Engineering Principles,
  // rule 5). The message is redacted first — a startup error must not print a
  // credential (06-security-engineering).
  const details = error instanceof Error ? (error.stack ?? error.message) : String(error);

  Logger.error('Backend failed to start', redactProcessSecrets(details), 'Bootstrap');
  process.exitCode = 1;
});
