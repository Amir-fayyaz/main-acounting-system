import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApplication } from './bootstrap.js';
import { loadConfiguration } from './infrastructure/config/configuration.js';
import { loadDotEnvFiles } from './infrastructure/config/dotenv.js';
import { toLogError } from './infrastructure/logging/logger.js';
import {
  createProcessLogging,
  startupProcessLogger,
  type ProcessLogging,
} from './infrastructure/logging/process-logging.js';

/**
 * The logging layer, once the configuration has been validated.
 *
 * Held outside `bootstrap` so the failure handler can reuse it; when the failure
 * is the configuration itself, there is nothing to build it from and
 * `startupProcessLogger` stands in.
 */
let logging: ProcessLogging | undefined;

async function bootstrap(): Promise<void> {
  // Configuration is loaded (and validated) before anything else is created, so
  // an invalid value stops the process without half-starting it (FND-003).
  loadDotEnvFiles();
  const configuration = loadConfiguration();

  // Logging is installed before the framework starts (FND-011): every line Nest
  // writes while bootstrapping — including a module-initialisation failure —
  // then has the configured shape and goes through the same redaction pass.
  logging = createProcessLogging(configuration);

  const app = await NestFactory.create(AppModule, { logger: logging.bridge });
  const config = configureApplication(app, logging.logger);

  await app.listen(config.port, config.host);

  logging.logger.info(
    `${config.runtime.serviceName} listening on http://${config.host}:${config.port}${config.apiPrefix} (${config.environment.name})`,
    { detail: { context: 'Bootstrap' } },
  );
}

void bootstrap().catch((error: unknown) => {
  // Never swallow a startup failure: report the cause and fail the process so
  // the container/orchestrator can restart or surface it (Engineering Principles,
  // rule 5). The logger redacts every string it writes, so a stack cannot print
  // a credential (06-security-engineering).
  const logger = logging?.logger ?? startupProcessLogger();
  const details = error instanceof Error ? (error.stack ?? error.message) : String(error);

  logger.error('Backend failed to start', {
    error: toLogError(error),
    detail: { context: 'Bootstrap', stack: details },
  });
  process.exitCode = 1;
});
