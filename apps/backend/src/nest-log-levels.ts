import type { LogLevel as NestLogLevel } from '@nestjs/common';
import type { LogLevel } from './infrastructure/config/configuration.types.js';

/**
 * Maps the configured log level to the levels NestJS knows about.
 *
 * The mapping lives at the process boundary: the configuration layer states
 * *what* the level is, and each process (HTTP, worker, scheduler, CLI) decides
 * how its framework applies it. Shared so the three processes cannot drift.
 */
export function toNestLogLevels(level: LogLevel): NestLogLevel[] {
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
