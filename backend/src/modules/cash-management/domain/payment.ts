import { Entity } from '../../../shared/domain/entity';
import { InvalidValueError } from '../../../shared/domain/invalid-value.error';
import { Money } from '../../../shared/domain/money';
export type PaymentMethod = 'CASH' | 'CARD' | 'CREDIT';
export class Payment extends Entity<string> {
  private constructor(id: string, public readonly tenantId: string, public readonly invoiceId: string, public readonly method: PaymentMethod, public readonly amount: Money) { super(id); }
  static record(id: string, tenantId: string, invoiceId: string, method: PaymentMethod, amount: Money): Payment { if (amount.amount <= 0n) throw new InvalidValueError('Payment must be positive'); return new Payment(id, tenantId, invoiceId, method, amount); }
}
