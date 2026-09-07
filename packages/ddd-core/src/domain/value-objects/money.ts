import { InvalidValueError } from '../errors/invalid-value.error';
import { ValueObject } from '../value-object';

/**
 * Immutable monetary amount stored as an integer in the currency's minor
 * unit (e.g. cents), so arithmetic never suffers floating-point drift.
 */
export class Money extends ValueObject {
  private constructor(
    public readonly amount: bigint,
    public readonly currency: string,
  ) {
    super();
  }

  static of(amount: bigint, currency: string): Money {
    if (amount < 0n) throw new InvalidValueError('Money amount must be non-negative');
    if (!/^[A-Z]{3}$/.test(currency)) throw new InvalidValueError('Currency must be an ISO-4217 code');
    return new Money(amount, currency);
  }

  static zero(currency: string): Money {
    return Money.of(0n, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    if (other.amount > this.amount) throw new InvalidValueError('Resulting amount cannot be negative');
    return Money.of(this.amount - other.amount, this.currency);
  }

  isZero(): boolean {
    return this.amount === 0n;
  }

  private assertSameCurrency(other: Money): void {
    if (other.currency !== this.currency) throw new InvalidValueError('Currency mismatch');
  }
}
