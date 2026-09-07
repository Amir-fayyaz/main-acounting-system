import { fail, isFail, isOk, ok } from './result';

describe('Result', () => {
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
});
