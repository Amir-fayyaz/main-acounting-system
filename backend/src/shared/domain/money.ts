import { InvalidValueError } from './invalid-value.error';
export class Money {
  private constructor(public readonly amount: bigint, public readonly currency: string) {}
  static of(amount: bigint, currency: string): Money { if (amount < 0n || !/^[A-Z]{3}$/.test(currency)) throw new InvalidValueError('Invalid money'); return new Money(amount, currency); }
  add(other: Money): Money { this.assertCurrency(other); return Money.of(this.amount + other.amount, this.currency); }
  subtract(other: Money): Money { this.assertCurrency(other); if (other.amount > this.amount) throw new InvalidValueError('Negative money'); return Money.of(this.amount - other.amount, this.currency); }
  private assertCurrency(other: Money): void { if (other.currency !== this.currency) throw new InvalidValueError('Currency mismatch'); }
}

