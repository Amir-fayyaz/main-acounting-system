import { describe, expect, it } from 'vitest';

import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';
import { Currency } from './currency.js';

describe('the registered MVP currency', () => {
  it('exposes IRR with the minor unit ISO 4217 defines for it', () => {
    expect(Currency.IRR.code).toBe('IRR');
    expect(Currency.IRR.minorUnit).toBe(0);
    expect(Currency.IRR.toString()).toBe('IRR');
    expect(Currency.IRR.toJSON()).toBe('IRR');
  });

  it('looks a currency up by code, forgiving case and padding', () => {
    expect(Currency.of('IRR')).toBe(Currency.IRR);
    expect(Currency.of(' irr ')).toBe(Currency.IRR);
    expect(Currency.IRR.equals(Currency.of('IRR'))).toBe(true);
  });

  it('reports registration without throwing', () => {
    expect(Currency.isRegistered('IRR')).toBe(true);
    expect(Currency.isRegistered('irr ')).toBe(true);
    expect(Currency.isRegistered('USD')).toBe(false);
    expect(Currency.isRegistered(null as unknown as string)).toBe(false);
  });
});

describe('Currency.register', () => {
  it('accepts a new code, which is how the abstraction stays extensible', () => {
    const usd = Currency.isRegistered('USD')
      ? Currency.of('USD')
      : Currency.register({ code: 'USD', minorUnit: 2 });

    expect(usd.code).toBe('USD');
    expect(usd.minorUnit).toBe(2);
    expect(Currency.isRegistered('USD')).toBe(true);
    expect(Currency.of('usd')).toBe(usd);
  });

  it('rejects registering a code twice instead of silently overwriting it', () => {
    expect(() => Currency.register({ code: 'IRR', minorUnit: 0 })).toThrow(
      'Currency: code IRR is already registered',
    );
  });

  it.each([
    ['a code that is too short', { code: 'US', minorUnit: 2 }],
    ['a code that is too long', { code: 'USDD', minorUnit: 2 }],
    ['a code with digits', { code: 'I22', minorUnit: 0 }],
    ['a blank code', { code: '   ', minorUnit: 0 }],
  ])('rejects %s', (_label, spec) => {
    expect(() => Currency.register(spec)).toThrow(InvalidPrimitiveError);
    expect(() => Currency.register(spec)).toThrow('Currency: code');
  });

  it('rejects a minor unit outside what ISO 4217 defines', () => {
    expect(() => Currency.register({ code: 'TST', minorUnit: -1 })).toThrow(
      'Currency: minorUnit must be between 0 and 4',
    );
    expect(() => Currency.register({ code: 'TST', minorUnit: 5 })).toThrow(
      'Currency: minorUnit must be between 0 and 4',
    );
    expect(() => Currency.register({ code: 'TST', minorUnit: 2.5 })).toThrow(
      'Currency: minorUnit must be an integer',
    );
  });

  it('rejects a spec that is not an object at runtime', () => {
    expect(() => Currency.register(null as unknown as { code: string; minorUnit: number })).toThrow(
      'Currency: spec must be an object',
    );
    expect(() => Currency.register({ code: 7 as unknown as string, minorUnit: 0 })).toThrow(
      'Currency: code must be a string',
    );
  });
});

describe('Currency.of', () => {
  it('rejects a code that was never registered rather than defaulting', () => {
    expect(() => Currency.of('EUR')).toThrow('Currency: code EUR is not registered');
    expect(() => Currency.of('')).toThrow('Currency: code must not be blank');
    expect(() => Currency.of(null as unknown as string)).toThrow('Currency: code must be a string');
  });
});

describe('Currency equality', () => {
  it('is value-based on the code', () => {
    expect(Currency.IRR.equals(Currency.of('IRR'))).toBe(true);
    expect(Currency.IRR.equals(null as unknown as Currency)).toBe(false);
    expect(Currency.IRR.equals(Currency.of('USD'))).toBe(false);
  });
});
