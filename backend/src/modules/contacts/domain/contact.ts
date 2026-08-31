import { AggregateRoot } from '../../../shared/domain/aggregate-root';
import { InvalidValueError } from '../../../shared/domain/invalid-value.error';
export type ContactType = 'CUSTOMER' | 'SUPPLIER';
export class Contact extends AggregateRoot<string> {
  private constructor(id: string, public readonly tenantId: string, public readonly type: ContactType, private name: string, private active: boolean) { super(id); }
  static create(id: string, tenantId: string, type: ContactType, name: string): Contact { if (!name.trim()) throw new InvalidValueError('Contact name is required'); return new Contact(id, tenantId, type, name.trim(), true); }
  rename(name: string): void { if (!name.trim()) throw new InvalidValueError('Contact name is required'); this.name = name.trim(); }
  archive(): void { this.active = false; }
  get displayName(): string { return this.name; }
  get isActive(): boolean { return this.active; }
}
