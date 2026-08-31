import { AggregateRoot } from '../../../shared/domain/aggregate-root';
import { InvalidStateError } from '../../../shared/domain/invalid-state.error';
import { InvalidValueError } from '../../../shared/domain/invalid-value.error';

export type TenantStatus = 'ACTIVE' | 'SUSPENDED';
export type TenantRole = 'OWNER' | 'ACCOUNTANT' | 'CASHIER' | 'STOCK_KEEPER';
export type MembershipStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED';

export class Tenant extends AggregateRoot<string> {
  private constructor(id: string, private name: string, private readonly ownerId: string, private readonly currency: string, private valuation: 'FIFO' | 'LIFO', private status: TenantStatus) { super(id); }
  static create(id: string, ownerId: string, name: string, currency = 'USD', valuation: 'FIFO' | 'LIFO' = 'FIFO'): Tenant {
    if (!name.trim() || !/^[A-Z]{3}$/.test(currency)) throw new InvalidValueError('Invalid tenant');
    return new Tenant(id, name.trim(), ownerId, currency, valuation, 'ACTIVE');
  }
  suspend(): void { this.status = 'SUSPENDED'; }
  activate(): void { this.status = 'ACTIVE'; }
  rename(name: string): void { if (!name.trim()) throw new InvalidValueError('Tenant name is required'); this.name = name.trim(); }
  get isActive(): boolean { return this.status === 'ACTIVE'; }
  get ownerUserId(): string { return this.ownerId; }
  get currencyCode(): string { return this.currency; }
  get valuationMethod(): 'FIFO' | 'LIFO' { return this.valuation; }
}
