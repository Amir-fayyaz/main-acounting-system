import { InvalidValueError } from '../errors/invalid-value.error';
import { Money } from './money';

describe('Money', () => {
  it('creates money from a non-negative bigint amount and ISO-4217 currency', () => {
    const money = Money.of(1500n, 'USD');

    expect(money.amount).toBe(1500n);
    expect(money.currency).toBe('USD');
  });

  it('compares money by value', () => {
    expect(Money.of(1500n, 'USD').equals(Money.of(1500n, 'USD'))).toBe(true);
    expect(Money.of(1500n, 'USD').equals(Money.of(1501n, 'USD'))).toBe(false);
    expect(Money.of(1500n, 'USD').equals(Money.of(1500n, 'EUR'))).toBe(false);
  });

  it('rejects negative amounts and malformed currencies', () => {
    expect(() => Money.of(-1n, 'USD')).toThrow(InvalidValueError);
    expect(() => Money.of(10n, 'usd')).toThrow(InvalidValueError);
    expect(() => Money.of(10n, 'USDD')).toThrow(InvalidValueError);
  });

  it('adds and subtracts within the same currency', () => {
    const base = Money.of(1000n, 'USD');

    expect(base.add(Money.of(500n, 'USD')).amount).toBe(1500n);
    expect(base.subtract(Money.of(400n, 'USD')).amount).toBe(600n);
  });

  it('rejects currency mismatches and negative results', () => {
    const usd = Money.of(1000n, 'USD');

    expect(() => usd.add(Money.of(1n, 'EUR'))).toThrow(InvalidValueError);
    expect(() => usd.subtract(Money.of(2000n, 'USD'))).toThrow(InvalidValueError);
  });
});
