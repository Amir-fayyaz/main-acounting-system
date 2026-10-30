import type { Configuration } from '../config/configuration.types.js';
import { processSecretRedactor } from '../config/secrets.js';
import type { Logger } from './logger.js';
import { NestLoggerBridge } from './nest-logger-bridge.js';
import { createLogger } from './structured-logger.js';

/**
 * The logging layer of a process, built before the DI container exists
 * (FND-011).
 *
 * A process boundary (`main.ts`, `worker.ts`, `scheduler.ts`, `seed.ts`, the
 * CLI) must be able to log its own startup failure, which happens before any
 * module is instantiated. It therefore cannot inject `LOGGER`; it composes the
 * same logger here instead — same configuration, same redactor, same adapters —
 * so a bootstrap line and a request line have one shape.
 *
 * The bridge is returned alongside the logger because the two are always used
 * together: the logger observes our code, the bridge makes the framework a
 * client of the same contract.
 */
export interface ProcessLogging {
  /** The contract the process boundary itself logs through. */
  readonly logger: Logger;
  /** The application logger to hand to `NestFactory`. */
  readonly bridge: NestLoggerBridge;
}

/**
 * A logger for a failure that happened before (or while) the configuration was
 * loaded.
 *
 * It cannot consult the configuration — that may be the thing that failed — so
 * it uses the one shape that is always safe to emit: JSON at `error` level on
 * stderr, redacted with whatever secrets the process holds.
 */
export function startupProcessLogger(service = 'backend'): Logger {
  return createLogger({
    service,
    level: 'error',
    format: 'json',
    secrets: processSecretRedactor(),
  });
}

/** Builds the process logging layer from the validated configuration. */
export function createProcessLogging(configuration: Configuration): ProcessLogging {
  const logger = createLogger({
    service: configuration.runtime.serviceName,
    level: configuration.logging.level,
    format: configuration.logging.format,
    secrets: processSecretRedactor(),
  });

  return { logger, bridge: new NestLoggerBridge(logger) };
}
