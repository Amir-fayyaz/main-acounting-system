import { describe, expect, it } from 'vitest';

import { InvalidPrimitiveError } from '../primitives/invalid-primitive-error.js';
import { RoundingMode } from '../primitives/rounding-mode.js';
import { Currency } from './currency.js';
import { Money } from './money.js';

/** A two-minor-unit currency so fractional amounts are representable in tests. */
const usd = (): Currency =>
  Currency.isRegistered('USD')
    ? Currency.of('USD')
    : Currency.register({ code: 'USD', minorUnit: 2 });

describe('Money.of', () => {
  it('holds an amount in the currency it was built with', () => {
    const money = Money.of('125000', Currency.IRR);
    expect(money.currency).toBe(Currency.IRR);
    expect(money.toDecimalString()).toBe('125000');
    expect(money.minorUnits).toBe(125000n);
    expect(money.toString()).toBe('IRR 125000');
  });

  it('pads to the precision of the currency', () => {
    expect(Money.of('5', usd()).toDecimalString()).toBe('5.00');
    expect(Money.of('5.1', usd()).toDecimalString()).toBe('5.10');
    expect(Money.of('1234.56', usd()).toDecimalString()).toBe('1234.56');
  });

  it('accepts a number through its shortest decimal form', () => {
    expect(Money.of(125000, Currency.IRR).toDecimalString()).toBe('125000');
    expect(Money.of(0.1, usd()).toDecimalString()).toBe('0.10');
  });

  it('rejects an amount with more precision than the currency stores', () => {
    expect(() => Money.of('123.45', Currency.IRR)).toThrow(InvalidPrimitiveError);
    expect(() => Money.of('123.45', Currency.IRR)).toThrow(
      'Money: amount 123.45 has 2 fractional digits but IRR stores 0',
    );
    expect(() => Money.of('1.005', usd())).toThrow(
      'Money: amount 1.005 has 3 fractional digits but USD stores 2',
    );
  });

  it('rounds away the extra precision only when a rule is stated', () => {
    expect(Money.of('123.5', Currency.IRR, RoundingMode.HALF_UP).toDecimalString()).toBe('124');
    expect(Money.of('123.5', Currency.IRR, RoundingMode.DOWN).toDecimalString()).toBe('123');
    expect(Money.of('-123.5', Currency.IRR, RoundingMode.HALF_UP).toDecimalString()).toBe('-124');
    expect(Money.of('-123.5', Currency.IRR, RoundingMode.CEILING).toDecimalString()).toBe('-123');
    expect(Money.of('1.005', usd(), RoundingMode.HALF_EVEN).toDecimalString()).toBe('1.00');
  });

  it('rejects malformed amounts and a missing currency', () => {
    expect(() => Money.of('one hundred', Currency.IRR)).toThrow('Money: amount must be');
    expect(() => Money.of(Number.NaN, Currency.IRR)).toThrow('Money: amount must be a finite');
    expect(() => Money.of('100', null as unknown as Currency)).toThrow(
      'Money: currency must be a Currency',
    );
    expect(() => Money.of('100', {} as unknown as Currency)).toThrow(
      'Money: currency must be a Currency',
    );
  });
});

describe('Money.zero and Money.fromMinorUnits', () => {
  it('builds an exact zero in the currency precision', () => {
    expect(Money.zero(Currency.IRR).toDecimalString()).toBe('0');
    expect(Money.zero(usd()).toDecimalString()).toBe('0.00');
    expect(Money.zero(Currency.IRR).isZero()).toBe(true);
  });

  it('builds from a raw integer count of minor units', () => {
    expect(Money.fromMinorUnits(125000n, Currency.IRR).toDecimalString()).toBe('125000');
    expect(Money.fromMinorUnits(-125000n, Currency.IRR).isNegative()).toBe(true);
    expect(() => Money.fromMinorUnits(125000 as unknown as bigint, Currency.IRR)).toThrow(
      'Money: minorUnits must be a bigint',
    );
    expect(() => Money.fromMinorUnits(1n, null as unknown as Currency)).toThrow(
      'Money: currency must be a Currency',
    );
  });
});

describe('monetary arithmetic', () => {
  it('adds and subtracts within one currency', () => {
    expect(
      Money.of('100', Currency.IRR)
        .add(Money.of('25.5', Currency.IRR, RoundingMode.DOWN))
        .toDecimalString(),
    ).toBe('125');
    expect(Money.of('100', usd()).add(Money.of('25.50', usd())).toDecimalString()).toBe('125.50');
    expect(Money.of('100', usd()).subtract(Money.of('125.50', usd())).toDecimalString()).toBe(
      '-25.50',
    );
    expect(Money.of('0', usd()).subtract(Money.of('0', usd())).isZero()).toBe(true);
  });

  it('refuses to mix currencies', () => {
    const inUsd = Money.of('100', usd());
    const inIrr = Money.of('100', Currency.IRR);

    expect(() => inUsd.add(inIrr)).toThrow('Money: cannot combine USD with IRR');
    expect(() => inUsd.subtract(inIrr)).toThrow(InvalidPrimitiveError);
    expect(() => inUsd.compareTo(inIrr)).toThrow('Money: cannot combine USD with IRR');
    expect(inUsd.equals(inIrr)).toBe(false);
  });

  it('rejects an operand that is not money at runtime', () => {
    expect(() => Money.of('100', usd()).add(null as unknown as Money)).toThrow(
      'Money: expected a Money',
    );
  });

  it('never carries binary floating point into an amount', () => {
    // 0.1 + 0.2 is 0.30000000000000004 in IEEE-754.
    expect(Money.of('0.1', usd()).add(Money.of('0.2', usd())).toDecimalString()).toBe('0.30');
    expect(Money.of('0.1', usd()).multiply('3', RoundingMode.HALF_UP).toDecimalString()).toBe(
      '0.30',
    );
    expect(Money.of('19.99', usd()).multiply('3', RoundingMode.HALF_UP).toDecimalString()).toBe(
      '59.97',
    );
  });

  it('multiplies with an explicit rounding rule', () => {
    expect(
      Money.of('100', Currency.IRR).multiply('2', RoundingMode.HALF_UP).toDecimalString(),
    ).toBe('200');
    expect(
      Money.of('100', Currency.IRR).multiply('0.5', RoundingMode.HALF_UP).toDecimalString(),
    ).toBe('50');
    expect(
      Money.of('100', Currency.IRR).multiply('0.333', RoundingMode.HALF_UP).toDecimalString(),
    ).toBe('33');
    expect(
      Money.of('100', Currency.IRR).multiply('0.333', RoundingMode.CEILING).toDecimalString(),
    ).toBe('34');
    expect(
      Money.of('-100', Currency.IRR).multiply('0.333', RoundingMode.FLOOR).toDecimalString(),
    ).toBe('-34');
  });

  it('divides with an explicit rounding rule', () => {
    expect(Money.of('100', Currency.IRR).divide('3', RoundingMode.HALF_UP).toDecimalString()).toBe(
      '33',
    );
    expect(Money.of('100', Currency.IRR).divide('3', RoundingMode.CEILING).toDecimalString()).toBe(
      '34',
    );
    expect(Money.of('100', Currency.IRR).divide('3', RoundingMode.DOWN).toDecimalString()).toBe(
      '33',
    );
    expect(Money.of('-100', Currency.IRR).divide('3', RoundingMode.HALF_UP).toDecimalString()).toBe(
      '-33',
    );
    expect(Money.of('10', usd()).divide('4', RoundingMode.HALF_UP).toDecimalString()).toBe('2.50');
  });

  it('rejects division by zero', () => {
    expect(() => Money.of('100', Currency.IRR).divide(0, RoundingMode.HALF_UP)).toThrow(
      'Money: division by zero',
    );
  });
});

describe('sign handling', () => {
  it('supports zero, positive and negative values', () => {
    const positive = Money.of('100', Currency.IRR);
    const negative = Money.of('-100', Currency.IRR);
    const zero = Money.zero(Currency.IRR);

    expect(positive.isPositive()).toBe(true);
    expect(positive.isNegative()).toBe(false);
    expect(negative.isNegative()).toBe(true);
    expect(negative.isPositive()).toBe(false);
    expect(zero.isZero()).toBe(true);
    expect(zero.isPositive()).toBe(false);
    expect(zero.isNegative()).toBe(false);
  });

  it('negates and takes the magnitude', () => {
    expect(Money.of('-100', Currency.IRR).negate().toDecimalString()).toBe('100');
    expect(Money.of('-100', Currency.IRR).abs().toDecimalString()).toBe('100');
    expect(Money.of('100', Currency.IRR).abs().toDecimalString()).toBe('100');
    expect(Money.zero(Currency.IRR).negate().isZero()).toBe(true);
  });
});

describe('Money comparison', () => {
  it('is value-based across construction styles', () => {
    expect(Money.of('1.5', usd()).equals(Money.of('1.50', usd()))).toBe(true);
    expect(Money.of('1.5', usd()).equals(Money.of('1.51', usd()))).toBe(false);
    expect(Money.of('1.5', usd()).equals(null as unknown as Money)).toBe(false);
  });

  it('orders within a currency', () => {
    expect(Money.of('1', usd()).compareTo(Money.of('2', usd()))).toBe(-1);
    expect(Money.of('2', usd()).compareTo(Money.of('1', usd()))).toBe(1);
    expect(Money.of('1.50', usd()).compareTo(Money.of('1.5', usd()))).toBe(0);
    expect(Money.of('-1', usd()).compareTo(Money.of('1', usd()))).toBe(-1);
  });
});

describe('Money serialization', () => {
  it('emits the decimal string plus ISO 4217 code the API contract expects', () => {
    expect(Money.of('125000', Currency.IRR).toJSON()).toEqual({
      amount: '125000',
      currency: 'IRR',
    });
    expect(JSON.stringify(Money.of('125000', Currency.IRR))).toBe(
      '{"amount":"125000","currency":"IRR"}',
    );
    expect(JSON.parse(JSON.stringify(Money.of('1234.50', usd())))).toEqual({
      amount: '1234.50',
      currency: 'USD',
    });
  });

  it('never serializes an amount as a JSON number', () => {
    expect(typeof Money.of('0.1', usd()).toJSON().amount).toBe('string');
  });
});
