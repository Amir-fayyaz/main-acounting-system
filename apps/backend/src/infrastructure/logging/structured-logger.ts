import { ActorScope } from '../../shared/actor/actor-scope.js';
import { TenantScope } from '../../shared/tenant/tenant-scope.js';
import type { SecretHolder } from '../config/secrets.js';
import { createJsonLogWriter } from './json-log-writer.js';
import { LogContext } from './log-context.js';
import type { LogRecord, LogSinks, LogWriter } from './log-record.js';
import {
  LOG_LEVEL_WEIGHT,
  type LogError,
  type Logger,
  type LogFields,
  type LogLevel,
} from './logger.js';
import { createPrettyLogWriter } from './pretty-log-writer.js';
import { redactText, sanitizeValue } from './redaction.js';

/** How the process renders a line. */
export type LogFormat = 'json' | 'pretty';

/** What the composition root must decide about a logger. */
export interface StructuredLoggerOptions {
  /** The process/service name written on every line. */
  readonly service: string;
  /** The lowest severity that is written. */
  readonly level: LogLevel;
  /** The output shape. */
  readonly format: LogFormat;
  /** The redactor this process holds; every string passes through it. */
  readonly secrets: SecretHolder;
  /** Where lines go; stdout/stderr in production, a capture in a test. */
  readonly sinks?: LogSinks;
  /** The clock; injectable so a test can fix the timestamp. */
  readonly now?: () => Date;
  /** A writer override; used by a test that asserts on records, not on text. */
  readonly writer?: LogWriter;
}

/**
 * The structured logger (FND-011; ADR-015 section 3).
 *
 * One implementation serves every call site, and it owns the three decisions a
 * caller must not make:
 *
 * 1. **What context a line carries.** The correlation id comes from
 *    `LogContext` (established by the HTTP middleware or a job), the tenant from
 *    `TenantScope`, the user from `ActorScope` — the boundaries that already
 *    authorised the work. A call site adds only what is specific to its event,
 *    and an explicit field always wins, because the site that knows better is
 *    the one at the event.
 * 2. **Whether the line is emitted at all.** The configured level is a
 *    threshold, not a filter list: `info` writes info, warn and error, and
 *    drops debug.
 * 3. **What is scrubbed.** Message, error message and every string inside
 *    detail go through the process redactor before a writer sees them.
 *
 * It never throws. A writer failure, a broken clock or a hostile detail value
 * is swallowed: the operation being observed is more important than the record
 * of it, and an observability layer that can fail a request is a liability.
 */
export function createLogger(options: StructuredLoggerOptions): Logger {
  const writer = options.writer ?? writerFor(options);
  const now = options.now ?? (() => new Date());
  const threshold = LOG_LEVEL_WEIGHT[options.level];

  function emit(level: LogLevel, message: string, fields?: LogFields): void {
    if (LOG_LEVEL_WEIGHT[level] < threshold) {
      return;
    }

    try {
      writer.write(buildRecord(level, message, fields, options, now()));
    } catch {
      // Observability must never fail the operation it observes.
    }
  }

  return {
    debug: (message, fields) => {
      emit('debug', message, fields);
    },
    info: (message, fields) => {
      emit('info', message, fields);
    },
    warn: (message, fields) => {
      emit('warn', message, fields);
    },
    error: (message, fields) => {
      emit('error', message, fields);
    },
  };
}

/** Chooses the writer the configuration asks for. */
function writerFor(options: StructuredLoggerOptions): LogWriter {
  return options.format === 'json'
    ? createJsonLogWriter(options.sinks)
    : createPrettyLogWriter(options.sinks);
}

/** Builds the record a writer receives: resolved context, redacted values. */
function buildRecord(
  level: LogLevel,
  message: string,
  fields: LogFields | undefined,
  options: StructuredLoggerOptions,
  timestamp: Date,
): LogRecord {
  const context = LogContext.current();

  const correlationId = fields?.correlationId ?? context?.correlationId;
  const tenantId = fields?.tenantId ?? TenantScope.currentTenantId();
  const userId = fields?.userId ?? ActorScope.current()?.userId;

  const detail =
    fields?.detail === undefined ? undefined : asDetail(fields.detail, options.secrets);

  return {
    timestamp: timestamp.toISOString(),
    level,
    service: fields?.service ?? context?.service ?? options.service,
    message: redactText(message, options.secrets),
    ...(correlationId === undefined ? {} : { correlationId }),
    ...(tenantId === undefined ? {} : { tenantId }),
    ...(userId === undefined ? {} : { userId }),
    ...(fields?.error === undefined ? {} : { error: reduceError(fields.error, options.secrets) }),
    ...(detail === undefined ? {} : { detail }),
  };
}

/** Reduces an error to the shape a line carries. */
function reduceError(error: LogError, secrets: SecretHolder): LogError {
  return {
    name: error.name,
    message: redactText(error.message, secrets),
    ...(error.category === undefined ? {} : { category: error.category }),
  };
}

/** Sanitizes the detail object, keeping it an object even if it was not one. */
function asDetail(
  detail: Readonly<Record<string, unknown>>,
  secrets: SecretHolder,
): Readonly<Record<string, unknown>> {
  const sanitized = sanitizeValue(detail, secrets);

  return typeof sanitized === 'object' && sanitized !== null && !Array.isArray(sanitized)
    ? (sanitized as Record<string, unknown>)
    : { value: sanitized };
}
