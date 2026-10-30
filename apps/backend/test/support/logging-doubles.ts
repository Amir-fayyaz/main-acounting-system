import type { LogFields, LogLevel, Logger } from '../../src/infrastructure/logging/logger.js';

/** One captured call. */
export interface RecordedLog {
  readonly level: LogLevel;
  readonly message: string;
  readonly fields?: LogFields;
}

/**
 * A `Logger` that records instead of writing (FND-011).
 *
 * Using the contract as the seam is the point: a test that needs to assert what
 * a component logged depends on `Logger`, never on a stdout capture or on
 * NestJS's logger, so the assertion survives a change of format.
 */
export class RecordingLogger implements Logger {
  public readonly entries: RecordedLog[] = [];

  public debug(message: string, fields?: LogFields): void {
    this.entries.push({ level: 'debug', message, fields });
  }

  public info(message: string, fields?: LogFields): void {
    this.entries.push({ level: 'info', message, fields });
  }

  public warn(message: string, fields?: LogFields): void {
    this.entries.push({ level: 'warn', message, fields });
  }

  public error(message: string, fields?: LogFields): void {
    this.entries.push({ level: 'error', message, fields });
  }

  /** The entries at one level, so a test does not repeat the filter. */
  public at(level: LogLevel): RecordedLog[] {
    return this.entries.filter((entry) => entry.level === level);
  }
}

/** A `Logger` that discards everything; for a test that only needs the seam. */
export const SILENT_LOGGER: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};
