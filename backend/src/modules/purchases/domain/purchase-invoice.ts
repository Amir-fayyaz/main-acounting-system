import { AggregateRoot } from '../../../shared/domain/aggregate-root';
import { InvalidStateError, } from '../../../shared/domain/invalid-state.error';
import { InvalidValueError } from '../../../shared/domain/invalid-value.error';
import { Money } from '../../../shared/domain/money';
import { PurchaseLine } from './purchase-line';
export type PurchaseInvoiceStatus = 'CONFIRMED' | 'REVERSED';
export class PurchaseInvoice extends AggregateRoot<string> {
  private constructor(id: string, public readonly tenantId: string, private readonly lines: readonly PurchaseLine[], private readonly total: Money, private status: PurchaseInvoiceStatus) { super(id); }
  static confirm(id: string, tenantId: string, lines: readonly PurchaseLine[]): PurchaseInvoice {
    if (!lines.length) throw new InvalidValueError('Invoice requires lines');
    const total = lines.reduce((sum, line) => sum + line.unitCost.amount * BigInt(line.quantity.value), 0n);
    return new PurchaseInvoice(id, tenantId, lines, Money.of(total, lines[0].unitCost.currency), 'CONFIRMED');
  }
  reverse(): void { if (this.status !== 'CONFIRMED') throw new InvalidStateError('Invoice cannot be reversed'); this.status = 'REVERSED'; }
  get currentStatus(): PurchaseInvoiceStatus { return this.status; }
  get amount(): Money { return this.total; }
}

