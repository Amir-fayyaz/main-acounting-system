import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * The ambient log context: the identifiers every line emitted during one
 * execution carries without being threaded through every signature (FND-011;
 * ADR-015 section 3).
 *
 * It mirrors the mechanism the transaction, tenant and actor boundaries already
 * use (`node:async_hooks`), so one request's log lines can be tied together
 * even when they are written ten frames below the controller, in a repository
 * or a job handler that never received the request.
 *
 * Three rules keep it honest:
 *
 * - **Propagation follows the async chain.** A scope is visible to everything
 *   awaited inside `run`, and to nothing else. Two concurrent requests never
 *   see each other's correlation id, and a scope cannot leak after its work
 *   settles.
 * - **The scope is not the source of truth for tenant or user.** Those are
 *   already owned by `TenantScope` and `ActorScope`; the structured logger reads
 *   them directly, so a log line cannot disagree with the boundary that
 *   authorised the work. This scope exists for what has no other owner — the
 *   request correlation id and the process name.
 * - **Only identifiers.** No request body, no header map, no state object: the
 *   context travels into every log call of the process, so it must never be
 *   able to carry something a caller would mind seeing twice.
 */

/** The identifiers a scope carries. */
export interface LogContextValues {
  /** The request correlation id assigned by the HTTP boundary. */
  readonly correlationId?: string;
  /** The process/service name, so an aggregated line says who wrote it. */
  readonly service?: string;
}

/** The ambient scope itself. */
export class LogContext {
  private static readonly storage = new AsyncLocalStorage<LogContextValues>();

  private constructor() {}

  /**
   * The context of the call stack that asks, or `undefined` outside any scope.
   *
   * `undefined` is the honest answer for a process-level execution (bootstrap,
   * a startup failure) where no request asked for a correlation id.
   */
  public static current(): LogContextValues | undefined {
    return LogContext.storage.getStore();
  }

  /**
   * Runs `work` with `values` published as the current context.
   *
   * Called by the trusted entry points — the HTTP correlation middleware, a
   * worker consuming a job that carries an id, a test — never by business code
   * inventing an identity for itself.
   */
  public static run<T>(values: LogContextValues, work: () => T): T {
    const merged = merge(LogContext.current(), values);
    return LogContext.storage.run(merged, work);
  }
}

/** Narrows an outer scope with an inner one without losing what was already set. */
function merge(outer: LogContextValues | undefined, inner: LogContextValues): LogContextValues {
  if (outer === undefined) {
    return Object.freeze({ ...inner });
  }

  return Object.freeze({
    ...outer,
    ...(inner.correlationId === undefined ? {} : { correlationId: inner.correlationId }),
    ...(inner.service === undefined ? {} : { service: inner.service }),
  });
}
