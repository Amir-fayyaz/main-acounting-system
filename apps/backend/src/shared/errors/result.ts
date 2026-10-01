import { describeValue } from '../primitives/assert.js';
import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';

/** Internal state of a successful `Result`. */
type SuccessState<T> = { readonly ok: true; readonly value: T };

/** Internal state of a failed `Result`. */
type FailureState<E> = { readonly ok: false; readonly error: E };

/**
 * The two states, as a union, so a `Result` can never hold both. `T` and `E`
 * occupy the same slot: constructing a success types away the failure and vice
 * versa, which is what makes "success and failure cannot both be active" a
 * property of the type rather than a convention nobody can check.
 */
type ResultState<T, E> = SuccessState<T> | FailureState<E>;

/** The two arms of {@link Result.match}. */
export interface ResultArms<T, E, U> {
  readonly ok: (value: T) => U;
  readonly fail: (error: E) => U;
}

/**
 * An explicit outcome: either a success carrying a value or a failure carrying
 * an error (SHR-002).
 *
 * Its job is to make one architectural boundary visible in the type system:
 *
 * ```text
 * Expected domain/application failure   →  Result / DomainError
 * Unexpected technical failure          →  Exception / infrastructure handling
 * ```
 *
 * A use case returns a `Result` when *not* doing the work is a normal,
 * anticipated answer — the period is closed, the record is missing, the total
 * would be negative. It throws when something went wrong that the business did
 * not decide about: a dead database, a bug, a null it never expected. Making
 * callers handle the first kind explicitly is what stops expected outcomes from
 * travelling the stack as exceptions and being logged as if they were bugs.
 *
 * Nothing here knows about HTTP, a database or a framework, so the domain layer
 * can use it without importing any of them. How (or whether) a failure reaches
 * a response body stays with the presentation layer.
 *
 * Note that `map`, `andThen` and `match` do not catch: if the callback throws,
 * the exception propagates. A thrown exception remains the signal for an
 * unexpected failure, and swallowing it here would blur exactly the boundary
 * this type exists to keep clear.
 */
export class Result<T, E> {
  /** A successful outcome holding `value`. */
  public static ok<T>(value: T): Result<T, never> {
    return new Result<T, never>({ ok: true, value });
  }

  /** A failed outcome holding `error`. */
  public static fail<E>(error: E): Result<never, E> {
    return new Result<never, E>({ ok: false, error });
  }

  /** Whether `value` is a `Result`, for untyped boundaries. */
  public static is(value: unknown): value is Result<unknown, unknown> {
    return value instanceof Result;
  }

  /**
   * Runs every result through one pass and keeps **all** failures — the
   * composition form. Returning the first failure would make a caller repeat an
   * expensive validation once per problem; collecting them means one rejection
   * reports every reason (the same shape as a multi-field validation error).
   *
   * Values are returned in input order, and so are errors.
   */
  public static all<T, E>(results: readonly Result<T, E>[]): Result<readonly T[], readonly E[]> {
    if (!Array.isArray(results)) {
      throw new InvalidPrimitiveError(
        'Result',
        `all expects an array of Result but received ${describeValue(results)}`,
      );
    }

    const values: T[] = [];
    const errors: E[] = [];

    for (const result of results) {
      if (!(result instanceof Result)) {
        throw new InvalidPrimitiveError(
          'Result',
          `all expects an array of Result but received ${describeValue(result)}`,
        );
      }
      if (result.state.ok) {
        values.push(result.state.value);
      } else {
        errors.push(result.state.error);
      }
    }

    if (errors.length > 0) {
      return new Result<readonly T[], readonly E[]>({ ok: false, error: errors });
    }
    return new Result<readonly T[], readonly E[]>({ ok: true, value: values });
  }

  private constructor(private readonly state: ResultState<T, E>) {
    Object.freeze(this);
  }

  public isOk(): boolean {
    return this.state.ok;
  }

  public isFail(): boolean {
    return !this.state.ok;
  }

  /**
   * The success value, or `undefined` on failure. Never throws — this is the
   * safe read the acceptance criteria ask for.
   */
  public value(): T | undefined {
    return this.state.ok ? this.state.value : undefined;
  }

  /** The failure's error, or `undefined` on success. Never throws. */
  public error(): E | undefined {
    return this.state.ok ? undefined : this.state.error;
  }

  /**
   * The success value, asserted. Reading it from a failure is a programming
   * error, so it fails loudly with which error it was holding instead of
   * quietly returning `undefined` and moving the bug downstream.
   */
  public valueOrThrow(): T {
    if (!this.state.ok) {
      throw new InvalidPrimitiveError(
        'Result',
        `cannot read the success value of a failed result (${describeError(this.state.error)})`,
      );
    }
    return this.state.value;
  }

  /** The failure's error, asserted. Reading it from a success is a programming error. */
  public errorOrThrow(): E {
    if (this.state.ok) {
      throw new InvalidPrimitiveError(
        'Result',
        'cannot read the error of a successful result; the outcome was ok',
      );
    }
    return this.state.error;
  }

  /** Consumes both states in one expression; the only place neither can be ignored. */
  public match<U>(arms: ResultArms<T, E, U>): U {
    return this.state.ok ? arms.ok(this.state.value) : arms.fail(this.state.error);
  }

  /** Transforms a success and passes a failure through untouched. */
  public map<U>(fn: (value: T) => U): Result<U, E> {
    return this.state.ok
      ? new Result<U, E>({ ok: true, value: fn(this.state.value) })
      : new Result<U, E>({ ok: false, error: this.state.error });
  }

  /** Transforms a failure and passes a success through untouched. */
  public mapError<F>(fn: (error: E) => F): Result<T, F> {
    return this.state.ok
      ? new Result<T, F>({ ok: true, value: this.state.value })
      : new Result<T, F>({ ok: false, error: fn(this.state.error) });
  }

  /** Chains a further step that can itself fail; a failure skips the step. */
  public andThen<U, F>(fn: (value: T) => Result<U, F>): Result<U, E | F> {
    return this.state.ok
      ? fn(this.state.value)
      : new Result<U, E | F>({ ok: false, error: this.state.error });
  }

  /** Recovers from a failure with another `Result`; a success passes through. */
  public orElse<U, F>(fn: (error: E) => Result<U, F>): Result<T | U, F> {
    return this.state.ok
      ? new Result<T | U, F>({ ok: true, value: this.state.value })
      : fn(this.state.error);
  }

  /** The success value, or `fallback` when this result failed. */
  public getOrElse(fallback: T): T {
    return this.state.ok ? this.state.value : fallback;
  }
}

/** Renders an error for a kernel-level message without dumping a whole object. */
function describeError(error: unknown): string {
  if (error !== null && typeof error === 'object') {
    const { code, message } = error as { code?: unknown; message?: unknown };
    if (typeof code === 'string' && typeof message === 'string') {
      return `${code}: ${message}`;
    }
    if (typeof message === 'string') {
      return message;
    }
  }
  return describeValue(error);
}
