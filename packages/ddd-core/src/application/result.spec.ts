import { fail, flatMap, isFail, isOk, map, ok, unwrap } from './result';
import type { Result } from './result';

describe('Result', () => {
  describe('ok / fail', () => {
    it('builds a success result carrying the value', () => {
      const result = ok(42);

      expect(isOk(result)).toBe(true);
      expect(isFail(result)).toBe(false);
      if (isOk(result)) expect(result.value).toBe(42);
    });

    it('builds a failure result carrying the error', () => {
      const error = new Error('boom');
      const result = fail(error);

      expect(isFail(result)).toBe(true);
      expect(isOk(result)).toBe(false);
      if (isFail(result)) expect(result.error).toBe(error);
    });

    it('never throws for plain values', () => {
      expect(() => ok(null)).not.toThrow();
      expect(() => ok(undefined)).not.toThrow();
      expect(() => fail(undefined)).not.toThrow();
    });
  });

  describe('isOk / isFail', () => {
    it('isOk narrows the success branch', () => {
      const r: Result<number, string> = ok(7);
      expect(isOk(r)).toBe(true);
    });

    it('isFail narrows the failure branch', () => {
      const r: Result<number, string> = fail('bad');
      expect(isFail(r)).toBe(true);
    });
  });

  describe('map', () => {
    it('transforms the success value', () => {
      const result = map(ok(2), (n) => n * 10);
      expect(result).toEqual({ ok: true, value: 20 });
    });

    it('leaves the failure untouched and preserves the error', () => {
      const result = map<number, string, number>(fail('boom'), (n) => n * 10);
      expect(result).toEqual({ ok: false, error: 'boom' });
    });

    it('passes the success value through the mapping function exactly once', () => {
      const fn = jest.fn((n: number) => n + 1);
      map(ok(1), fn);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(1);
    });

    it('does not invoke the mapping function on failure', () => {
      const fn = jest.fn((n: number) => n + 1);
      const result: Result<number, string> = fail('nope');
      map(result, fn);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('flatMap', () => {
    it('chains a Result-returning function on success', () => {
      const result = flatMap(ok(2), (n) => ok(n * 10));
      expect(result).toEqual({ ok: true, value: 20 });
    });

    it('short-circuits on failure', () => {
      const fn = jest.fn((n: number) => ok(n));
      const result = flatMap<number, string, number, never>(fail('boom'), fn);
      expect(fn).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: false, error: 'boom' });
    });

    it('can produce a new failure from the success branch', () => {
      const result = flatMap(ok(2), () => fail('late boom'));
      expect(result).toEqual({ ok: false, error: 'late boom' });
    });
  });

  describe('unwrap', () => {
    it('returns the success value', () => {
      expect(unwrap(ok('hi'))).toBe('hi');
    });

    it('throws the carried error when it is an Error instance', () => {
      const err = new Error('boom');
      expect(() => unwrap(fail(err))).toThrow(err);
    });

    it('wraps non-Error failures into a generic Error', () => {
      expect(() => unwrap(fail('boom'))).toThrow('boom');
    });
  });
});
