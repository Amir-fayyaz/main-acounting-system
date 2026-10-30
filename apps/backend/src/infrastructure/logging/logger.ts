/**
 * The structured-logging contract (FND-011; ADR-015 section 3).
 *
 * One interface for the whole process, and the *only* thing the rest of the
 * codebase is allowed to depend on. Which adapter writes the line, in which
 * format, and to which stream is an infrastructure decision made once at
 * bootstrap — a use case, a guard or a job handler never knows.
 *
 * Three rules are part of the contract, not of an adapter:
 *
 * - **Primitives only.** Fields are strings, numbers, booleans and plain
 *   objects. No `Error` instance, no `DomainError`, no Drizzle or NestJS type:
 *   an adapter that received one would have to understand it, and every
 *   consumer would start importing a framework to log.
 * - **Nothing sensitive by construction.** There is no field for a password, a
 *   token or a header map, so no call site can log one by accident. Detail is
 *   still redacted by the adapter, because a redacted line is cheaper than a
 *   leaked credential.
 * - **Logging never breaks a request.** Every method is `void` and the adapter
 *   swallows its own failures; a logger that throws must never be able to fail
 *   the operation it was observing.
 */

/** The levels the contract knows, lowest to highest severity. */
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;

/** One level name. */
export type LogLevel = (typeof LOG_LEVELS)[number];

/** Ordering used to decide whether a line is emitted at the configured level. */
export const LOG_LEVEL_WEIGHT: Readonly<Record<LogLevel, number>> = Object.freeze({
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
});

/** Whether a value names a level the contract supports. */
export function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === 'string' && (LOG_LEVELS as readonly string[]).includes(value);
}

/**
 * An error as a log line may carry it.
 *
 * A reduced shape on purpose: a stack is `detail.stack` when a call site needs
 * it, and the message is redacted like every other string. `category` is the
 * coarse vocabulary the error model already uses (`client`, `conflict`, …), so
 * a future query can group failures without parsing prose.
 */
export interface LogError {
  readonly name: string;
  readonly message: string;
  readonly category?: string;
}

/**
 * The fields a call site may add to a line.
 *
 * Every field is optional: context (correlation id, tenant, user) is normally
 * supplied by `LogContext` and the ambient scopes, so a call site states only
 * what is specific to the event.
 */
export interface LogFields {
  /** The request's correlation id, when the call site must override the ambient one. */
  readonly correlationId?: string;
  /** The company the work belongs to. */
  readonly tenantId?: string;
  /** The authenticated user the work is acting for. */
  readonly userId?: string;
  /** The process/service name; the logger's configured name by default. */
  readonly service?: string;
  /** The failure, reduced to the shape a log line may carry. */
  readonly error?: LogError;
  /** Event-specific values; redacted and JSON-serialized by the adapter. */
  readonly detail?: Readonly<Record<string, unknown>>;
}

/**
 * Reduces a thrown value to the shape a line may carry.
 *
 * Call sites catch `unknown`, so they cannot hand the logger an `Error` and
 * expect it to survive: this is the one conversion, kept in the contract so it
 * is done identically everywhere. The message is still redacted by the logger.
 */
export function toLogError(error: unknown, category?: string): LogError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(category === undefined ? {} : { category }),
    };
  }

  return {
    name: typeof error,
    message: String(error),
    ...(category === undefined ? {} : { category }),
  };
}

/** The logging contract every layer depends on. */
export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}
