import { AggregateRoot } from '../../../shared/domain/aggregate-root';
import { InvalidStateError } from '../../../shared/domain/invalid-state.error';
import { TenantRole, MembershipStatus } from './tenant';

export class TenantMembership extends AggregateRoot<string> {
  private constructor(id: string, public readonly tenantId: string, public readonly userId: string, private role: TenantRole, private status: MembershipStatus) { super(id); }
  static invite(id: string, tenantId: string, userId: string, role: Exclude<TenantRole, 'OWNER'>): TenantMembership { return new TenantMembership(id, tenantId, userId, role, 'INVITED'); }
  activate(): void { if (this.status !== 'INVITED') throw new InvalidStateError('Membership cannot be activated'); this.status = 'ACTIVE'; }
  suspend(): void { this.status = 'SUSPENDED'; }
  changeRole(role: Exclude<TenantRole, 'OWNER'>): void { if (this.status === 'SUSPENDED') throw new InvalidStateError('Suspended membership'); this.role = role; }
  get currentRole(): TenantRole { return this.role; }
  get isActive(): boolean { return this.status === 'ACTIVE'; }
}

