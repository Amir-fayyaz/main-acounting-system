/**
 * Explicit success/failure result. Prefer returning Result over throwing for
 * expected business outcomes so callers are forced to handle both branches.
 *
 * `Result<T, E>` is a discriminated union on `ok`:
 * - `ok: true`  carries `value: T`
 * - `ok: false` carries `error: E`
 *
 * Use the `ok` / `fail` constructors to build a Result, the type guards
 * (`isOk` / `isFail`) to narrow it, and the helpers (`map` / `flatMap`) to
 * chain transformations while preserving the success/failure shape.
 */
export type Result<TValue, TError> =
  { readonly ok: true; readonly value: TValue } | { readonly ok: false; readonly error: TError };

export function ok<TValue>(value: TValue): Result<TValue, never> {
  return { ok: true, value };
}

export function fail<TError>(error: TError): Result<never, TError> {
  return { ok: false, error };
}

export function isOk<TValue, TError>(
  result: Result<TValue, TError>,
): result is Extract<Result<TValue, TError>, { ok: true }> {
  return result.ok;
}

export function isFail<TValue, TError>(
  result: Result<TValue, TError>,
): result is Extract<Result<TValue, TError>, { ok: false }> {
  return !result.ok;
}

/**
 * Functor map: transforms the success value, leaves failures untouched.
 * Failure errors flow through unchanged.
 */
export function map<TValue, TError, TMapped>(
  result: Result<TValue, TError>,
  fn: (value: TValue) => TMapped,
): Result<TMapped, TError> {
  return result.ok ? ok(fn(result.value)) : result;
}

/**
 * Monad flatMap: chains a Result-returning function on the success value,
 * leaving failures untouched. The inner Result's error type replaces the
 * outer error type so callers see the most-specific failure.
 */
export function flatMap<TValue, TError, TNext, TNextError>(
  result: Result<TValue, TError>,
  fn: (value: TValue) => Result<TNext, TNextError>,
): Result<TNext, TError | TNextError> {
  return result.ok ? fn(result.value) : result;
}

/**
 * Unwrap the success value or throw the error. Use only when a failure is
 * genuinely unrecoverable at the call site; prefer `isOk` / `isFail` for
 * exhaustive handling.
 */
export function unwrap<TValue, TError>(result: Result<TValue, TError>): TValue {
  if (result.ok) return result.value;
  throw result.error instanceof Error ? result.error : new Error(String(result.error));
}
