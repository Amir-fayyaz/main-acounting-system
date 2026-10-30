import type { LogError, LogLevel } from './logger.js';

/**
 * One line, already redacted and ready to be serialized (FND-011).
 *
 * This is the boundary between the logger and a writer: the logger owns
 * context, severity and redaction; a writer owns nothing but the text shape and
 * the stream. A new format is therefore a new writer, and cannot change what a
 * line may contain.
 */
export interface LogRecord {
  /** ISO-8601 instant, UTC. */
  readonly timestamp: string;
  readonly level: LogLevel;
  /** The process/service name, so an aggregated line says who wrote it. */
  readonly service: string;
  readonly message: string;
  readonly correlationId?: string;
  readonly tenantId?: string;
  readonly userId?: string;
  readonly error?: LogError;
  readonly detail?: Readonly<Record<string, unknown>>;
}

/** Where a writer sends a line. */
export interface LogWriter {
  /** Emits one record; never throws. */
  write(record: LogRecord): void;
}

/** The two streams a writer may use: `info`/`debug` to stdout, `warn`/`error` to stderr. */
export interface LogSinks {
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
}

/** The sinks a production process uses: one line, never buffered beyond the write. */
export const PROCESS_SINKS: LogSinks = Object.freeze({
  out: (line: string) => {
    process.stdout.write(line);
  },
  err: (line: string) => {
    process.stderr.write(line);
  },
});

/** Whether a level is written to stderr (its severity is operational attention). */
export function usesStderr(level: LogLevel): boolean {
  return level === 'warn' || level === 'error';
}
