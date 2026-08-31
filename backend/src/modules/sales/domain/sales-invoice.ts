import { AggregateRoot } from '../../../shared/domain/aggregate-root';
import { InvalidStateError } from '../../../shared/domain/invalid-state.error';
import { InvalidValueError } from '../../../shared/domain/invalid-value.error';
import { Money } from '../../../shared/domain/money';
import { Quantity } from '../../../shared/domain/quantity';
import { SalesLine } from './sales-line';

export type SalesInvoiceStatus = 'CONFIRMED' | 'REVERSED' | 'PARTIALLY_RETURNED' | 'FULLY_RETURNED';
export class SalesInvoice extends AggregateRoot<string> {
  private constructor(id: string, public readonly tenantId: string, private readonly lines: SalesLine[], private readonly total: Money, private status: SalesInvoiceStatus) { super(id); }
  static confirm(id: string, tenantId: string, lines: SalesLine[], discount: Money): SalesInvoice {
    if (!lines.length) throw new InvalidValueError('Invoice requires lines');
    const subtotal = lines.reduce((sum, line) => sum + line.unitPrice.amount * BigInt(line.quantity.value), 0n);
    if (discount.currency !== lines[0].unitPrice.currency || discount.amount > subtotal) throw new InvalidValueError('Invalid discount');
    return new SalesInvoice(id, tenantId, lines, Money.of(subtotal - discount.amount, discount.currency), 'CONFIRMED');
  }
  reverse(): void { if (this.status !== 'CONFIRMED') throw new InvalidStateError('Invoice cannot be reversed'); this.status = 'REVERSED'; }
  markReturned(fully: boolean): void { if (!['CONFIRMED', 'PARTIALLY_RETURNED'].includes(this.status)) throw new InvalidStateError('Invoice cannot be returned'); this.status = fully ? 'FULLY_RETURNED' : 'PARTIALLY_RETURNED'; }
  get currentStatus(): SalesInvoiceStatus { return this.status; }
  get amount(): Money { return this.total; }
  get items(): readonly SalesLine[] { return this.lines; }
}
