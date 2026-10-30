import {
  PROCESS_SINKS,
  usesStderr,
  type LogRecord,
  type LogSinks,
  type LogWriter,
} from './log-record.js';

/**
 * The production writer: one JSON object per line (FND-011; ADR-015 section 3).
 *
 * A log aggregator reads this stream without a parser per format: one object,
 * one newline, fixed field names. The shape is exactly the documented one —
 * `timestamp`, `level`, `service`, `message` and the optional context, error
 * and detail fields — and nothing else, so a new field is a deliberate contract
 * change rather than a stray key.
 *
 * Two failure rules matter more than the format:
 *
 * - **It never throws.** Serialization can fail (a value that survived the
 *   redaction pass but not `JSON.stringify`); the writer then emits a minimal
 *   line built from the always-serializable fields. A log call must never fail
 *   the operation it observes.
 * - **It never writes a partial line.** The whole string is composed before the
 *   single `write`, so two concurrent log calls cannot interleave inside a
 *   record.
 */
export function createJsonLogWriter(sinks: LogSinks = PROCESS_SINKS): LogWriter {
  return {
    write(record: LogRecord): void {
      const line = `${serialize(record)}\n`;
      if (usesStderr(record.level)) {
        sinks.err(line);
      } else {
        sinks.out(line);
      }
    },
  };
}

/** Serializes one record, falling back to a minimal line instead of throwing. */
function serialize(record: LogRecord): string {
  try {
    return JSON.stringify(record);
  } catch {
    return JSON.stringify({
      timestamp: record.timestamp,
      level: record.level,
      service: record.service,
      message: record.message,
      detail: { serializationFailed: true },
    });
  }
}
