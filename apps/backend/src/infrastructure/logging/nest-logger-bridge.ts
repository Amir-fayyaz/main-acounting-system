import type { LoggerService } from '@nestjs/common';

import type { Logger } from './logger.js';

/**
 * Routes NestJS's own output through the structured contract (FND-011).
 *
 * The framework logs outside any module — bootstrap, module initialisation,
 * route mapping, an uncaught exception — and those lines would otherwise be
 * the only human-shaped text left in a JSON stream. Registering this bridge as
 * the application logger makes the framework a client of the same contract, so
 * there is exactly one shape and one redaction pass in the process.
 *
 * It is the only file that knows Nest's logger surface, and it knows it in one
 * direction: framework → contract. The level mapping is deliberately lossy
 * where Nest is finer-grained (`verbose` and `debug` are both `debug`), because
 * the contract's four levels are the ones an operator acts on.
 *
 * It never throws: Nest calls its logger from failure paths, where an exception
 * would replace the original error with a logging error.
 */
export class NestLoggerBridge implements LoggerService {
  public constructor(private readonly logger: Logger) {}

  public log(message: unknown, context?: unknown): void {
    this.write('info', message, context);
  }

  public info(message: unknown, context?: unknown): void {
    this.write('info', message, context);
  }

  public warn(message: unknown, context?: unknown): void {
    this.write('warn', message, context);
  }

  public error(message: unknown, stack?: unknown, context?: unknown): void {
    this.write('error', message, context, stack);
  }

  public debug(message: unknown, context?: unknown): void {
    this.write('debug', message, context);
  }

  public verbose(message: unknown, context?: unknown): void {
    this.write('debug', message, context);
  }

  public fatal(message: unknown, context?: unknown): void {
    this.write('error', message, context);
  }

  /** One framework line, reduced to the contract's vocabulary. */
  private write(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: unknown,
    context?: unknown,
    stack?: unknown,
  ): void {
    try {
      const text = typeof message === 'string' ? message : stringify(message);
      const detail: Record<string, unknown> = {};

      if (typeof context === 'string' && context.length > 0) {
        detail['context'] = context;
      }

      if (typeof stack === 'string' && stack.length > 0) {
        detail['stack'] = stack;
      }

      const fields = Object.keys(detail).length === 0 ? undefined : { detail };

      switch (level) {
        case 'debug':
          this.logger.debug(text, fields);
          return;
        case 'info':
          this.logger.info(text, fields);
          return;
        case 'warn':
          this.logger.warn(text, fields);
          return;
        case 'error':
          this.logger.error(text, fields);
          return;
      }
    } catch {
      // A framework log call must never throw in place of the real error.
    }
  }
}

/** Best-effort text for a non-string framework message. */
function stringify(value: unknown): string {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }

  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}
