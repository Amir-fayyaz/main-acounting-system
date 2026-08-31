import { Entity } from '../../../shared/domain/entity';
import { InvalidValueError } from '../../../shared/domain/invalid-value.error';
export type PlanCode = 'FREE' | 'PAID';
export class SubscriptionPlan extends Entity<string> {
  private constructor(id: string, public readonly code: PlanCode, private invoiceLimit: number | null) { super(id); }
  static create(id: string, code: PlanCode, invoiceLimit: number | null = null): SubscriptionPlan { if (invoiceLimit !== null && invoiceLimit < 0) throw new InvalidValueError('Invalid plan limit'); return new SubscriptionPlan(id, code, invoiceLimit); }
  allowsInvoiceCount(count: number): boolean { return this.invoiceLimit === null || count < this.invoiceLimit; }
}

