/**
 * Explicit success/failure result. Prefer returning Result over throwing for
 * expected business outcomes so callers are forced to handle both branches.
 */
export type Result<TValue, TError> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly error: TError };

export function ok<TValue>(value: TValue): Result<TValue, never> {
  return { ok: true, value };
}

export function fail<TError>(error: TError): Result<never, TError> {
  return { ok: false, error };
}

export function isOk<TValue, TError>(result: Result<TValue, TError>): result is Extract<Result<TValue, TError>, { ok: true }> {
  return result.ok;
}

export function isFail<TValue, TError>(result: Result<TValue, TError>): result is Extract<Result<TValue, TError>, { ok: false }> {
  return !result.ok;
}
