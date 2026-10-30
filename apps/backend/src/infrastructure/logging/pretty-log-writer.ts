import {
  PROCESS_SINKS,
  usesStderr,
  type LogRecord,
  type LogSinks,
  type LogWriter,
} from './log-record.js';

/**
 * The development/test writer: a readable line instead of raw JSON (FND-011).
 *
 * It exists because a human reads the log during development, and because
 * hiding the context would make the propagation rules unobservable exactly
 * where they are being written. It therefore prints *the same* information as
 * the JSON writer — level, service, correlation id, tenant, user, message,
 * error and detail — only arranged for reading. It performs no redaction of its
 * own: it receives an already-redacted record, which is what keeps the two
 * adapters from drifting apart on the one property that matters.
 *
 * No colour and no timestamps rounded for humans: the output stays greppable
 * and diffable, so a test can assert on it and a developer can pipe it.
 */
export function createPrettyLogWriter(sinks: LogSinks = PROCESS_SINKS): LogWriter {
  return {
    write(record: LogRecord): void {
      const line = `${format(record)}\n`;
      if (usesStderr(record.level)) {
        sinks.err(line);
      } else {
        sinks.out(line);
      }
    },
  };
}

/** Formats one record for a human, with every context field visible. */
function format(record: LogRecord): string {
  const parts = [
    record.timestamp,
    record.level.toUpperCase().padEnd(5),
    `[${record.service}]`,
    ...(record.correlationId === undefined ? [] : [`[correlation:${record.correlationId}]`]),
    ...(record.tenantId === undefined ? [] : [`[tenant:${record.tenantId}]`]),
    ...(record.userId === undefined ? [] : [`[user:${record.userId}]`]),
    record.message,
  ];

  if (record.error !== undefined) {
    parts.push(`error=${record.error.name}: ${record.error.message}`);
  }

  if (record.detail !== undefined) {
    parts.push(safeJson(record.detail));
  }

  return parts.join(' ');
}

/** Serializes the detail, falling back to a marker instead of throwing. */
function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '{"serializationFailed":true}';
  }
}
