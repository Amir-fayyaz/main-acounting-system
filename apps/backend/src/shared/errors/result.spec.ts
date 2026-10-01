import { describe, expect, it, vi } from 'vitest';

import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';
import { NotFoundError, ValidationError } from './category-errors.js';
import { DomainError } from './domain-error.js';
import { ErrorCategory } from './error-category.js';
import { Result } from './result.js';

const notFound = (): NotFoundError => new NotFoundError('The invoice does not exist.');

describe('creating and reading a Result', () => {
  it('reports a success and exposes its value', () => {
    const result = Result.ok(42);

    expect(result.isOk()).toBe(true);
    expect(result.isFail()).toBe(false);
    expect(result.value()).toBe(42);
    expect(result.error()).toBeUndefined();
    expect(result.valueOrThrow()).toBe(42);
  });

  it('reports a failure and exposes its error', () => {
    const error = notFound();
    const result = Result.fail(error);

    expect(result.isFail()).toBe(true);
    expect(result.isOk()).toBe(false);
    expect(result.error()).toBe(error);
    expect(result.value()).toBeUndefined();
    expect(result.errorOrThrow()).toBe(error);
  });

  it('handles falsy but legitimate values and errors', () => {
    expect(Result.ok(0).value()).toBe(0);
    expect(Result.ok(false).value()).toBe(false);
    expect(Result.ok(undefined).isOk()).toBe(true);
    expect(Result.fail(null).isFail()).toBe(true);
    expect(Result.fail(null).error()).toBeNull();
    expect(Result.fail(null).value()).toBeUndefined();
  });

  it('is frozen so an outcome cannot be rewritten after the fact', () => {
    expect(Object.isFrozen(Result.ok(1))).toBe(true);
    expect(Object.isFrozen(Result.fail('nope'))).toBe(true);
  });
});

describe('success and failure are mutually exclusive', () => {
  it('never reports both states for one result', () => {
    const success = Result.ok(1);
    const failure = Result.fail('boom');

    expect(success.isOk() && success.isFail()).toBe(false);
    expect(failure.isOk() && failure.isFail()).toBe(false);
    expect(success.value()).toBeDefined();
    expect(success.error()).toBeUndefined();
    expect(failure.value()).toBeUndefined();
    expect(failure.error()).toBeDefined();
  });

  it('runs exactly one arm of match', () => {
    const arms = { ok: vi.fn(() => 'ok'), fail: vi.fn(() => 'fail') };

    expect(Result.ok(1).match(arms)).toBe('ok');
    expect(Result.fail('x').match(arms)).toBe('fail');
    expect(arms.ok).toHaveBeenCalledTimes(1);
    expect(arms.fail).toHaveBeenCalledTimes(1);
  });
});

describe('reading the wrong side', () => {
  it('refuses to invent a success value for a failure', () => {
    expect(() => Result.fail(notFound()).valueOrThrow()).toThrow(InvalidPrimitiveError);
    expect(() => Result.fail(notFound()).valueOrThrow()).toThrow(
      'Result: cannot read the success value of a failed result (NOT_FOUND: The invoice does not exist.)',
    );
  });

  it('refuses to invent an error for a success', () => {
    expect(() => Result.ok(1).errorOrThrow()).toThrow(InvalidPrimitiveError);
    expect(() => Result.ok(1).errorOrThrow()).toThrow(
      'Result: cannot read the error of a successful result',
    );
  });

  it('names a non-object error without dumping it', () => {
    expect(() => Result.fail({ code: 7 }).valueOrThrow()).toThrow(
      'Result: cannot read the success value of a failed result (an object)',
    );
  });
});

describe('transformations', () => {
  it('maps a success and leaves a failure untouched', () => {
    const doubled = Result.ok(2).map((value) => value * 2);
    const failed = Result.fail(notFound()).map(() => 'never runs');

    expect(doubled.value()).toBe(4);
    expect(doubled.isOk()).toBe(true);
    expect(failed.isFail()).toBe(true);
    expect(failed.value()).toBeUndefined();
  });

  it('does not invoke the callback for a failure', () => {
    const fn = vi.fn(() => 'x');
    Result.fail('boom').map(fn);
    expect(fn).not.toHaveBeenCalled();
  });

  it('maps an error and leaves a success untouched', () => {
    const mapped = Result.fail('nope').mapError((error) => `${error}!`);

    expect(mapped.error()).toBe('nope!');
    expect(mapped.isFail()).toBe(true);
    expect(
      Result.ok(1)
        .mapError(() => 'x')
        .value(),
    ).toBe(1);
  });

  it('chains with andThen, skipping the step on failure', () => {
    const step = (value: number): Result<string, DomainError> =>
      value > 0 ? Result.ok(`+${value}`) : Result.fail(new ValidationError('must be positive'));

    expect(Result.ok(1).andThen(step).value()).toBe('+1');

    const failed = Result.ok(0).andThen(step);
    expect(failed.isFail()).toBe(true);
    expect(failed.error()?.code).toBe('VALIDATION_FAILED');

    const skipped = Result.fail(notFound()).andThen(step);
    expect(skipped.isFail()).toBe(true);
    expect(skipped.error()?.code).toBe('NOT_FOUND');
  });

  it('widens the failure type when a chained step can fail differently', () => {
    const result: Result<number, ValidationError | NotFoundError> = Result.fail(
      new NotFoundError('missing'),
    ).andThen(() => Result.ok(1));

    expect(result.error()?.code).toBe('NOT_FOUND');
  });

  it('recovers with orElse, and passes a success through', () => {
    const recovered = Result.fail('nope').orElse(() => Result.ok('fallback'));
    expect(recovered.value()).toBe('fallback');
    expect(recovered.isOk()).toBe(true);

    const kept = Result.ok('original').orElse(() => Result.ok('fallback'));
    expect(kept.value()).toBe('original');
  });

  it('falls back with getOrElse', () => {
    const failed: Result<number, string> = Result.fail('x');

    expect(Result.ok(7).getOrElse(0)).toBe(7);
    expect(failed.getOrElse(0)).toBe(0);
  });
});

describe('composition with Result.all', () => {
  it('collects every value, in input order', () => {
    const all = Result.all([Result.ok(1), Result.ok(2), Result.ok(3)]);

    expect(all.isOk()).toBe(true);
    expect(all.value()).toEqual([1, 2, 3]);
  });

  it('collects every failure rather than stopping at the first', () => {
    const first = new ValidationError('first is invalid');
    const second = new NotFoundError('second is missing');

    const all = Result.all([Result.ok(1), Result.fail(first), Result.ok(2), Result.fail(second)]);

    expect(all.isFail()).toBe(true);
    expect(all.value()).toBeUndefined();
    expect(all.error()).toEqual([first, second]);
  });

  it('succeeds for an empty list', () => {
    expect(Result.all([]).value()).toEqual([]);
  });

  it('rejects a non-Result entry or a non-array', () => {
    expect(() => Result.all([Result.ok(1), 2 as unknown as Result<number, never>])).toThrow(
      'Result: all expects an array of Result',
    );
    expect(() => Result.all('nope' as unknown as Result<number, never>[])).toThrow(
      'Result: all expects an array of Result',
    );
  });
});

describe('the exception boundary', () => {
  it('lets an unexpected exception propagate instead of swallowing it', () => {
    expect(() =>
      Result.ok(1).map(() => {
        throw new Error('unexpected bug');
      }),
    ).toThrow('unexpected bug');

    expect(() =>
      Result.ok(1).andThen(() => {
        throw new Error('unexpected bug');
      }),
    ).toThrow('unexpected bug');

    expect(() =>
      Result.ok(1).match({
        ok: () => {
          throw new Error('unexpected bug');
        },
        fail: () => 'x',
      }),
    ).toThrow('unexpected bug');
  });

  it('carries a DomainError as a first-class expected failure', () => {
    const result: Result<number, DomainError> = Result.fail(new NotFoundError('gone'));

    expect(result.error()).toBeInstanceOf(DomainError);
    expect(result.error()?.category).toBe(ErrorCategory.NOT_FOUND);
    expect(result.error()?.toJSON()).toEqual({
      code: 'NOT_FOUND',
      category: 'NOT_FOUND',
      message: 'gone',
      details: [],
    });
  });
});
